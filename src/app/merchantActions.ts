import { countActiveProfessionals, isStarterPlan } from "../config/plans";
import { DEFAULT_HOURS } from "../constants/defaults";
import * as appointmentService from "../services/appointmentService";
import { sendWhatsAppText } from "../services/whatsappOutbound";
import * as businessService from "../services/businessService";
import * as professionalService from "../services/professionalService";
import * as serviceCatalogService from "../services/serviceCatalogService";
import { findProfessional, findService } from "../state/selectors";
import { state } from "../state/store";
import type { AppointmentRow, AppointmentStatus } from "../types";
import { applyBusinessPreview, toggleCardMenu } from "../ui/render/merchantDashboard";
import { buildAppointmentRescheduledBySalonMessage } from "../utils/whatsappTemplates";
import { formatCurrency, formatTime } from "../utils/formatters";
import { getErrorMessage } from "../utils/errors";
import { readFileAsDataUrl } from "../utils/files";
import { slugify } from "../utils/strings";
import { getPublicHistoricoUrlByPortalToken, showLoading, showToast, openModal } from "../ui/dom";
import { closeAppointmentModal, closeModal } from "./appointmentActions";
import { loadSupportBusinesses } from "./bootstrap";
import { refreshAllBusinessData } from "./refresh";
import { createSupportEvent } from "./supportEvents";

export { toggleCardMenu };

export async function populateProfessionalServicesForBusiness(businessId: string): Promise<void> {
  const data = await serviceCatalogService.listServiceIdNameForBusiness(businessId);
  const el = document.getElementById("newProfServices");
  if (el) el.innerHTML = data.map((service) => `<option value="${service.id}">${service.name}</option>`).join("");
}

export async function saveBusinessProfile(): Promise<void> {
  if (!state.business) return;

  const payload = {
    name: (document.getElementById("businessName") as HTMLInputElement).value.trim(),
    slug: slugify((document.getElementById("businessSlug") as HTMLInputElement).value.trim()),
    category: (document.getElementById("businessCategory") as HTMLSelectElement).value,
    description: (document.getElementById("businessDescription") as HTMLTextAreaElement).value.trim(),
    whatsapp: (document.getElementById("businessWhatsapp") as HTMLInputElement).value.trim(),
    instagram: (document.getElementById("businessInstagram") as HTMLInputElement).value.trim(),
    address: (document.getElementById("businessAddress") as HTMLInputElement).value.trim(),
    logo_emoji: (document.getElementById("businessLogoEmoji") as HTMLInputElement).value.trim() || "✂️",
    logo_image_url: state.business.logo_image_url || "",
    cover_image_url: state.business.cover_image_url || "",
  };

  if (!payload.name || !payload.slug) {
    showToast("Nome e slug sao obrigatorios.");
    return;
  }

  const hoursPayload = (state.hours.length ? state.hours : DEFAULT_HOURS).map((hour) => {
    const active = (document.getElementById(`hour-active-${hour.day_of_week}`) as HTMLInputElement).checked;
    return {
      business_id: state.business!.id,
      day_of_week: hour.day_of_week,
      day_name: hour.day_name,
      open_time: active ? (document.getElementById(`hour-open-${hour.day_of_week}`) as HTMLInputElement).value || null : null,
      close_time: active ? (document.getElementById(`hour-close-${hour.day_of_week}`) as HTMLInputElement).value || null : null,
      active,
    };
  });

  showLoading(true);
  try {
    await businessService.updateBusiness(state.business.id, payload);
    await businessService.upsertBusinessHours(hoursPayload);
    state.business = { ...state.business, ...payload };
    showToast("Dados do negocio salvos.");
    await refreshAllBusinessData();
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error));
  } finally {
    showLoading(false);
  }
}

export function toggleHourInputs(dayOfWeek: number): void {
  const active = (document.getElementById(`hour-active-${dayOfWeek}`) as HTMLInputElement).checked;
  (document.getElementById(`hour-open-${dayOfWeek}`) as HTMLInputElement).disabled = !active;
  (document.getElementById(`hour-close-${dayOfWeek}`) as HTMLInputElement).disabled = !active;
}

export async function handleBusinessLogoUpload(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const dataUrl = await readFileAsDataUrl(file);
    state.business = { ...(state.business || {}), logo_image_url: dataUrl } as typeof state.business;
    applyBusinessPreview(state.business);
    showToast("Logo carregada. Clique em salvar para gravar.");
  } catch (error) {
    console.error(error);
    showToast("Nao foi possivel carregar a logo.");
  }
}

export async function handleBusinessCoverUpload(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const dataUrl = await readFileAsDataUrl(file);
    state.business = { ...(state.business || {}), cover_image_url: dataUrl } as typeof state.business;
    applyBusinessPreview(state.business);
    showToast("Foto de capa carregada. Clique em salvar para gravar.");
  } catch (error) {
    console.error(error);
    showToast("Nao foi possivel carregar a capa.");
  }
}

export function resetServiceModal(): void {
  state.editingServiceId = null;
  const t = (id: string, v: string) => {
    const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
    if (el) el.value = v;
  };
  const title = document.getElementById("serviceModalTitle");
  if (title) title.textContent = "Novo Serviço";
  const saveBtn = document.getElementById("serviceModalSaveBtn");
  if (saveBtn) saveBtn.textContent = "Salvar Serviço";
  t("newServiceName", "");
  t("newServiceDescription", "");
  t("newServiceCategory", "Corte");
  t("newServicePrice", "");
  t("newServiceDuration", "");
  t("newServiceIcon", "");
  const active = document.getElementById("newServiceActive") as HTMLInputElement | null;
  if (active) active.checked = true;
}

export function resetProfessionalModal(): void {
  state.editingProfessionalId = null;
  const title = document.getElementById("professionalModalTitle");
  if (title) title.textContent = "Novo Profissional";
  const saveBtn = document.getElementById("professionalModalSaveBtn");
  if (saveBtn) saveBtn.textContent = "Salvar";
  (document.getElementById("newProfName") as HTMLInputElement).value = "";
  (document.getElementById("newProfRole") as HTMLInputElement).value = "";
  (document.getElementById("newProfEmoji") as HTMLInputElement).value = "";
  Array.from((document.getElementById("newProfServices") as HTMLSelectElement).options).forEach((option) => {
    option.selected = false;
  });
  (document.getElementById("newProfActive") as HTMLInputElement).checked = true;
}

export function openServiceModal(): void {
  resetServiceModal();
  openModal("modalNovoServico");
}

export function closeServiceModal(): void {
  closeModal("modalNovoServico");
  state.supportContextBusinessId = null;
  resetServiceModal();
}

export function editService(serviceId: string): void {
  const service = state.services.find((item) => item.id === serviceId);
  if (!service) return;
  state.editingServiceId = serviceId;
  const title = document.getElementById("serviceModalTitle");
  if (title) title.textContent = "Editar Serviço";
  const saveBtn = document.getElementById("serviceModalSaveBtn");
  if (saveBtn) saveBtn.textContent = "Salvar Alterações";
  (document.getElementById("newServiceName") as HTMLInputElement).value = service.name || "";
  (document.getElementById("newServiceDescription") as HTMLTextAreaElement).value = service.description || "";
  (document.getElementById("newServiceCategory") as HTMLSelectElement).value = service.category || "Corte";
  (document.getElementById("newServicePrice") as HTMLInputElement).value = String(service.price || "");
  (document.getElementById("newServiceDuration") as HTMLInputElement).value = String(service.duration || "");
  (document.getElementById("newServiceIcon") as HTMLInputElement).value = service.icon || "";
  (document.getElementById("newServiceActive") as HTMLInputElement).checked = Boolean(service.active);
  openModal("modalNovoServico");
}

export async function toggleServiceActive(serviceId: string): Promise<void> {
  const service = state.services.find((item) => item.id === serviceId);
  if (!service) return;
  showLoading(true);
  try {
    await serviceCatalogService.setServiceActive(serviceId, !service.active);
    showToast(service.active ? "Servico desativado com sucesso." : "Servico reativado com sucesso.");
    await refreshAllBusinessData();
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error));
  } finally {
    showLoading(false);
  }
}

export function openProfessionalModal(): void {
  resetProfessionalModal();
  openModal("modalNovoProf");
}

export function closeProfessionalModal(): void {
  closeModal("modalNovoProf");
  state.supportContextBusinessId = null;
  resetProfessionalModal();
}

export function editProfessional(professionalId: string): void {
  const professional = state.professionals.find((item) => item.id === professionalId);
  if (!professional) return;
  state.editingProfessionalId = professionalId;
  const title = document.getElementById("professionalModalTitle");
  if (title) title.textContent = "Editar Profissional";
  const saveBtn = document.getElementById("professionalModalSaveBtn");
  if (saveBtn) saveBtn.textContent = "Salvar Alterações";
  (document.getElementById("newProfName") as HTMLInputElement).value = professional.name || "";
  (document.getElementById("newProfRole") as HTMLInputElement).value = professional.role || "";
  (document.getElementById("newProfEmoji") as HTMLInputElement).value = professional.emoji || "";
  (document.getElementById("newProfActive") as HTMLInputElement).checked = Boolean(professional.active);
  const assignedServiceIds = new Set(
    state.professionalServices.filter((item) => item.professional_id === professionalId).map((item) => item.service_id)
  );
  Array.from((document.getElementById("newProfServices") as HTMLSelectElement).options).forEach((option) => {
    option.selected = assignedServiceIds.has(option.value);
  });
  openModal("modalNovoProf");
}

export async function toggleProfessionalActive(professionalId: string): Promise<void> {
  const professional = state.professionals.find((item) => item.id === professionalId);
  if (!professional) return;
  if (state.business && isStarterPlan(state.business) && !professional.active) {
    const otherActive = countActiveProfessionals(state.professionals.filter((p) => p.id !== professionalId));
    if (otherActive >= 1) {
      showToast("No Plano Starter você pode manter apenas 1 profissional ativo. Faça upgrade ao Pro para adicionar mais.");
      return;
    }
  }
  showLoading(true);
  try {
    await professionalService.setProfessionalActive(professionalId, !professional.active);
    showToast(professional.active ? "Profissional desativado com sucesso." : "Profissional reativado com sucesso.");
    await refreshAllBusinessData();
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error));
  } finally {
    showLoading(false);
  }
}

export async function saveService(): Promise<void> {
  if (!state.business && !state.supportContextBusinessId) return;
  const isEditing = Boolean(state.editingServiceId);
  const targetBusinessId = state.supportContextBusinessId || state.business!.id;
  const fromSupport = Boolean(state.supportContextBusinessId);
  const payload = {
    business_id: targetBusinessId,
    name: (document.getElementById("newServiceName") as HTMLInputElement).value.trim(),
    description: (document.getElementById("newServiceDescription") as HTMLTextAreaElement).value.trim(),
    category: (document.getElementById("newServiceCategory") as HTMLSelectElement).value,
    price: Number((document.getElementById("newServicePrice") as HTMLInputElement).value || 0),
    duration: Number((document.getElementById("newServiceDuration") as HTMLInputElement).value || 0),
    icon: (document.getElementById("newServiceIcon") as HTMLInputElement).value.trim() || "✂️",
    active: (document.getElementById("newServiceActive") as HTMLInputElement).checked,
  };

  if (!payload.name || !payload.duration) {
    showToast("Preencha nome e duracao do servico.");
    return;
  }

  showLoading(true);
  try {
    const { error } = isEditing
      ? await serviceCatalogService.updateService(state.editingServiceId!, payload)
      : await serviceCatalogService.insertService(payload);
    if (error) throw error;
    if (fromSupport) {
      await createSupportEvent({
        businessId: targetBusinessId,
        eventType: isEditing ? "service_updated" : "service_created",
        title: isEditing ? "Serviço atualizado pelo suporte" : "Serviço criado pelo suporte",
        details: `${payload.name} · ${formatCurrency(payload.price)} · ${payload.duration} min`,
      });
    }
    closeServiceModal();
    resetServiceModal();
    showToast(isEditing ? "Servico atualizado com sucesso." : "Servico salvo com sucesso.");
    state.supportContextBusinessId = null;
    if (state.business) await refreshAllBusinessData();
    if (state.isPlatformAdmin) await loadSupportBusinesses();
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error));
  } finally {
    showLoading(false);
  }
}

export async function saveProfessional(): Promise<void> {
  if (!state.business && !state.supportContextBusinessId) return;
  const isEditing = Boolean(state.editingProfessionalId);
  const targetBusinessId = state.supportContextBusinessId || state.business!.id;
  const fromSupport = Boolean(state.supportContextBusinessId);

  const selectedServiceIds = Array.from((document.getElementById("newProfServices") as HTMLSelectElement).selectedOptions).map(
    (option) => option.value
  );
  const payload = {
    business_id: targetBusinessId,
    name: (document.getElementById("newProfName") as HTMLInputElement).value.trim(),
    role: (document.getElementById("newProfRole") as HTMLInputElement).value.trim(),
    emoji: (document.getElementById("newProfEmoji") as HTMLInputElement).value.trim() || "👤",
    active: (document.getElementById("newProfActive") as HTMLInputElement).checked,
  };

  if (!payload.name) {
    showToast("Informe o nome do profissional.");
    return;
  }

  if (!fromSupport && state.business && isStarterPlan(state.business) && payload.active) {
    const excludeId = isEditing ? state.editingProfessionalId! : null;
    const pool = excludeId ? state.professionals.filter((p) => p.id !== excludeId) : state.professionals;
    if (countActiveProfessionals(pool) >= 1) {
      showToast("No Plano Starter você pode manter apenas 1 profissional ativo. Faça upgrade ao Pro para adicionar mais.");
      return;
    }
  }

  showLoading(true);
  try {
    const result = isEditing
      ? await professionalService.updateProfessional(state.editingProfessionalId!, payload)
      : await professionalService.insertProfessional(payload);
    if (result.error) throw result.error;
    const professional = result.data as { id: string };

    if (isEditing) {
      await professionalService.deleteProfessionalServiceLinks(professional.id);
    }

    if (selectedServiceIds.length) {
      await professionalService.insertProfessionalServiceLinks(
        selectedServiceIds.map((serviceId) => ({
          professional_id: professional.id,
          service_id: serviceId,
        }))
      );
    }

    if (fromSupport) {
      await createSupportEvent({
        businessId: targetBusinessId,
        eventType: isEditing ? "professional_updated" : "professional_created",
        title: isEditing ? "Profissional atualizado pelo suporte" : "Profissional criado pelo suporte",
        details: `${payload.name}${payload.role ? ` · ${payload.role}` : ""}`,
      });
    }

    closeProfessionalModal();
    resetProfessionalModal();
    showToast(isEditing ? "Profissional atualizado com sucesso." : "Profissional salvo com sucesso.");
    state.supportContextBusinessId = null;
    if (state.business) await refreshAllBusinessData();
    if (state.isPlatformAdmin) await loadSupportBusinesses();
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error));
  } finally {
    showLoading(false);
  }
}

export async function saveAppointment(): Promise<void> {
  if (!state.business) return;
  const isEditing = Boolean(state.editingAppointmentId);

  const payload = {
    business_id: state.business.id,
    client_name: (document.getElementById("newApptClient") as HTMLInputElement).value.trim(),
    client_phone: (document.getElementById("newApptPhone") as HTMLInputElement).value.trim(),
    service_id: (document.getElementById("newApptService") as HTMLSelectElement).value,
    professional_id: (document.getElementById("newApptProfessional") as HTMLSelectElement).value || null,
    appointment_date: (document.getElementById("newApptDate") as HTMLInputElement).value,
    appointment_time: (document.getElementById("newApptTime") as HTMLInputElement).value,
    status: (isEditing ? state.selectedAppointment?.status || "confirmado" : "confirmado") as AppointmentStatus,
  };

  if (!payload.client_name || !payload.client_phone || !payload.service_id || !payload.appointment_date || !payload.appointment_time) {
    showToast("Preencha todos os campos do agendamento.");
    return;
  }

  const timeForRpc = formatTime(payload.appointment_time);
  const slotOk = await appointmentService.isSlotAvailable({
    businessId: state.business.id,
    serviceId: payload.service_id,
    professionalId: payload.professional_id,
    date: payload.appointment_date,
    time: timeForRpc,
    excludeAppointmentId: isEditing ? state.editingAppointmentId : null,
  });
  if (!slotOk) {
    showToast("Este horário não está disponível para o profissional escolhido. Use a grade de horários livres.");
    return;
  }

  const orig = state.editingAppointmentOriginal;
  const dateChanged = Boolean(isEditing && orig && orig.appointment_date !== payload.appointment_date);
  const timeChanged = Boolean(isEditing && orig && formatTime(orig.appointment_time) !== timeForRpc);
  const newPortalToken =
    isEditing && orig && state.business.slug && (dateChanged || timeChanged) ? globalThis.crypto.randomUUID() : null;

  showLoading(true);
  try {
    const updatePayload =
      isEditing && newPortalToken ? { ...payload, client_portal_token: newPortalToken } : payload;
    const { error } = isEditing
      ? await appointmentService.updateAppointment(state.editingAppointmentId!, updatePayload)
      : await appointmentService.insertAppointment(payload);
    if (error) throw error;

    if (isEditing && orig && state.business.slug && newPortalToken && (dateChanged || timeChanged)) {
      const svc = findService(payload.service_id);
      const prof = findProfessional(payload.professional_id);
      const merged: AppointmentRow = {
        ...orig,
        client_name: payload.client_name,
        client_phone: payload.client_phone,
        service_id: payload.service_id,
        professional_id: payload.professional_id,
        appointment_date: payload.appointment_date,
        appointment_time: timeForRpc.length <= 5 ? `${timeForRpc}:00` : timeForRpc,
        status: payload.status,
        client_portal_token: newPortalToken,
      };
      const historicoUrl = getPublicHistoricoUrlByPortalToken(state.business.slug, newPortalToken);
      const msg = buildAppointmentRescheduledBySalonMessage({
        clientName: merged.client_name,
        businessName: state.business.name,
        serviceName: svc?.name || "Serviço",
        professionalName: prof?.name || "",
        newAppointmentDate: merged.appointment_date,
        newAppointmentTime: merged.appointment_time,
        historicoUrl,
      });
      const r = await sendWhatsAppText(merged.client_phone, msg);
      closeAppointmentModal();
      await refreshAllBusinessData();
      let toastMsg = "Agendamento atualizado.";
      if (r.usedApi && r.ok) toastMsg += " Cliente notificado (WhatsApp).";
      else if (!r.usedApi && r.ok) toastMsg += " Abra o WhatsApp para avisar o cliente.";
      else toastMsg += " Não foi possível abrir o WhatsApp — confira o telefone.";
      showToast(toastMsg);
      return;
    }

    closeAppointmentModal();
    showToast(isEditing ? "Agendamento atualizado com sucesso." : "Agendamento criado com sucesso.");
    await refreshAllBusinessData();
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error));
  } finally {
    showLoading(false);
  }
}
