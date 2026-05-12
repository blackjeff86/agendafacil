import * as appointmentService from "../services/appointmentService";
import { canUseAutomaticCustomerWhatsApp } from "../config/plans";
import { sendWhatsAppTemplate, sendWhatsAppText } from "../services/whatsappOutbound";
import { findProfessional, findSeries, findService } from "../state/selectors";
import { state, STATUS_LABELS } from "../state/store";
import type { AppointmentRow, AppointmentStatus } from "../types";
import { formatCurrency, formatLongDate, formatRecurrenceLabel, formatTime } from "../utils/formatters";
import { getFriendlyAppointmentError, getErrorMessage } from "../utils/errors";
import {
  buildAppointmentCancellationFromRow,
  buildAppointmentCancellationTemplateFromRow,
  buildAppointmentConfirmationFromRow,
  buildAppointmentConfirmationTemplateFromRow,
  buildAppointmentRescheduledFromRow,
  type AppointmentCancellationKind,
} from "../utils/whatsappTemplates";
import { getCustomerPortalUrl, showLoading, showToast, openModal, closeModal as closeModalEl } from "../ui/dom";
import { refreshAllBusinessData } from "./refresh";
import { createSupportEvent } from "./supportEvents";

function normalizeName(value: string): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizePhone(value: string): string {
  return (value || "").replace(/\D/g, "");
}

export function closeModal(id: string): void {
  closeModalEl(id);
  if (id === "modalConfirmAction") {
    state.pendingConfirmAction = null;
  }
}

export function openApptDetail(id: string): void {
  const appointment = state.appointments.find((item) => item.id === id);
  if (!appointment) return;

  state.selectedAppointment = appointment;
  const service = findService(appointment.service_id);
  const professional = findProfessional(appointment.professional_id);
  const status = STATUS_LABELS[appointment.status] || STATUS_LABELS.pendente;
  const series = appointment.series_id ? findSeries(appointment.series_id) : null;

  const setText = (eid: string, text: string) => {
    const el = document.getElementById(eid);
    if (el) el.textContent = text;
  };
  setText("detailClientName", appointment.client_name);
  setText("detailClientPhone", appointment.client_phone);
  setText("detailClientEmail", appointment.client_email || "—");
  setText("detailService", service?.name || "—");
  setText("detailProf", professional?.name || "Sem preferencia");
  setText("detailDate", formatLongDate(appointment.appointment_date));
  setText("detailTime", formatTime(appointment.appointment_time));
  setText("detailSeries", series ? `${formatRecurrenceLabel(series.recurrence_type)} · ${series.occurrences}x` : "Agendamento avulso");
  setText("detailPrice", formatCurrency(service?.price || 0));

  const detailStatus = document.getElementById("detailStatus");
  if (detailStatus) detailStatus.innerHTML = `<span class="badge ${status.cls}">${status.label}</span>`;
  const confirmBtn = document.getElementById("detailConfirmBtn") as HTMLButtonElement | null;
  const doneBtn = document.getElementById("detailDoneBtn") as HTMLButtonElement | null;
  const cancelBtn = document.getElementById("detailCancelBtn") as HTMLButtonElement | null;
  if (confirmBtn) {
    confirmBtn.style.display = appointment.status === "confirmado" || appointment.status === "cancelado" ? "none" : "flex";
    confirmBtn.textContent = appointment.status === "concluido" ? "Voltar para confirmado" : "Confirmar";
  }
  if (doneBtn) doneBtn.style.display = appointment.status === "concluido" || appointment.status === "cancelado" ? "none" : "flex";
  if (cancelBtn) cancelBtn.style.display = appointment.status === "cancelado" ? "none" : "flex";

  const row = document.getElementById("seriesActionRow");
  if (row) row.style.display = series ? "flex" : "none";
  openModal("modalApptDetail");
}

export function openSeriesEditModal(): void {
  const appointment = state.selectedAppointment;
  if (!appointment?.series_id) return;
  const series = findSeries(appointment.series_id);
  if (!series) return;

  const se = document.getElementById("seriesEditService");
  const pe = document.getElementById("seriesEditProfessional");
  if (se)
    se.innerHTML = state.services
      .map((service) => `<option value="${service.id}" ${service.id === series.service_id ? "selected" : ""}>${service.name}</option>`)
      .join("");
  if (pe)
    pe.innerHTML = [`<option value="">Sem preferência</option>`]
      .concat(
        state.professionals.map(
          (professional) =>
            `<option value="${professional.id}" ${professional.id === series.professional_id ? "selected" : ""}>${professional.name}</option>`
        )
      )
      .join("");
  (document.getElementById("seriesEditStartDate") as HTMLInputElement).value = series.start_date;
  (document.getElementById("seriesEditTime") as HTMLInputElement).value = formatTime(series.appointment_time);
  (document.getElementById("seriesEditType") as HTMLSelectElement).value = series.recurrence_type;
  (document.getElementById("seriesEditOccurrences") as HTMLInputElement).value = String(series.occurrences || 4);
  (document.getElementById("seriesEditNotes") as HTMLTextAreaElement).value = series.notes || "";
  openModal("modalSeriesEdit");
}

export async function saveSeriesEdit(): Promise<void> {
  const appointment = state.selectedAppointment;
  if (!appointment?.series_id) return;
  showLoading(true);
  try {
    const { error } = await appointmentService.updateAppointmentSeriesRpc({
      p_series_id: appointment.series_id,
      p_service_id: (document.getElementById("seriesEditService") as HTMLSelectElement).value,
      p_professional_id: (document.getElementById("seriesEditProfessional") as HTMLSelectElement).value || null,
      p_start_date: (document.getElementById("seriesEditStartDate") as HTMLInputElement).value,
      p_appointment_time: (document.getElementById("seriesEditTime") as HTMLInputElement).value,
      p_recurrence_type: (document.getElementById("seriesEditType") as HTMLSelectElement).value,
      p_occurrences: Number((document.getElementById("seriesEditOccurrences") as HTMLInputElement).value || 4),
      p_notes: (document.getElementById("seriesEditNotes") as HTMLTextAreaElement).value.trim() || null,
    });
    if (error) throw error;
    if (state.isPlatformAdmin) {
      await createSupportEvent({
        businessId: appointment.business_id,
        eventType: "series_updated",
        title: "Recorrência atualizada",
        details: `Série ${appointment.series_id} atualizada pelo suporte/lojista.`,
      });
    }
    closeModal("modalSeriesEdit");
    closeModal("modalApptDetail");
    showToast("Recorrência atualizada com sucesso.");
    await refreshAllBusinessData();
  } catch (error) {
    console.error(error);
    showToast(getFriendlyAppointmentError(error));
  } finally {
    showLoading(false);
  }
}

export function deleteCurrentSeries(): void {
  const appointment = state.selectedAppointment;
  if (!appointment?.series_id) return;
  openConfirmActionModal({
    title: "Excluir recorrência",
    message: "Deseja excluir toda a série recorrente e todos os seus agendamentos?",
    confirmLabel: "Excluir recorrência",
    confirmClass: "btn btn-danger",
    onConfirm: async () => {
      const { error } = await appointmentService.deleteAppointmentSeriesRpc(appointment.series_id!);
      if (error) throw error;
      if (state.isPlatformAdmin) {
        await createSupportEvent({
          businessId: appointment.business_id,
          eventType: "series_deleted",
          title: "Recorrência excluída",
          details: `Série ${appointment.series_id} removida.`,
        });
      }
      closeModal("modalApptDetail");
      showToast("Recorrência excluída.");
      await refreshAllBusinessData();
    },
  });
}

export function resetAppointmentModal(): void {
  state.editingAppointmentId = null;
  const t = (id: string, v: string) => {
    const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
    if (el) el.value = v;
  };
  const title = document.getElementById("apptModalTitle");
  if (title) title.textContent = "Novo Agendamento";
  const saveBtn = document.getElementById("apptModalSaveBtn");
  if (saveBtn) saveBtn.textContent = "Salvar Agendamento";
  t("newApptClient", "");
  t("newApptPhone", "");
  t("newApptService", "");
  t("newApptProfessional", "");
  t("newApptDate", "");
  t("newApptTime", "");
  const availabilityHint = document.getElementById("apptAvailabilityHint");
  const availabilityGrid = document.getElementById("apptAvailabilityGrid");
  const rescheduleNotice = document.getElementById("apptRescheduleNotice");
  if (availabilityHint) availabilityHint.textContent = "Escolha serviço, profissional e data para ver os horários livres.";
  if (availabilityGrid) availabilityGrid.innerHTML = "";
  if (rescheduleNotice) rescheduleNotice.classList.add("hidden");
}

export function openAppointmentModal(): void {
  resetAppointmentModal();
  openModal("modalNovoAppt");
}

export function closeAppointmentModal(): void {
  closeModal("modalNovoAppt");
  resetAppointmentModal();
}

export function editAppointmentFromDetail(): void {
  if (!state.selectedAppointment) return;
  const appointment = state.selectedAppointment;
  state.editingAppointmentId = appointment.id;
  const title = document.getElementById("apptModalTitle");
  if (title) title.textContent = "Editar Agendamento";
  const saveBtn = document.getElementById("apptModalSaveBtn");
  if (saveBtn) saveBtn.textContent = "Salvar Alterações";
  (document.getElementById("newApptClient") as HTMLInputElement).value = appointment.client_name || "";
  (document.getElementById("newApptPhone") as HTMLInputElement).value = appointment.client_phone || "";
  (document.getElementById("newApptService") as HTMLSelectElement).value = appointment.service_id || "";
  (document.getElementById("newApptProfessional") as HTMLSelectElement).value = appointment.professional_id || "";
  (document.getElementById("newApptDate") as HTMLInputElement).value = appointment.appointment_date || "";
  (document.getElementById("newApptTime") as HTMLInputElement).value = formatTime(appointment.appointment_time);
  closeModal("modalApptDetail");
  openModal("modalNovoAppt");
  const sync = (window as unknown as { syncAppointmentAvailability?: () => Promise<void> }).syncAppointmentAvailability;
  if (typeof sync === "function") {
    void sync();
  }
}

async function notifyCustomerCancellation(appt: AppointmentRow, kind: AppointmentCancellationKind): Promise<string> {
  const businessName = state.business?.name || "Nosso estabelecimento";
  const svc = findService(appt.service_id);
  const canAutomate = canUseAutomaticCustomerWhatsApp(state.business);
  if (canAutomate) {
    const template = buildAppointmentCancellationTemplateFromRow(appt, businessName, svc?.name || "Serviço");
    if (template) {
      const templateResult = await sendWhatsAppTemplate(appt.client_phone, template);
      if (templateResult.ok) return "Cliente notificado (template WhatsApp).";
    }
  }
  const msg = buildAppointmentCancellationFromRow(appt, businessName, svc?.name || "Serviço", kind);
  const r = await sendWhatsAppText(appt.client_phone, msg, { preferApi: canAutomate });
  if (r.usedApi && r.ok) return "Cliente notificado (WhatsApp API).";
  if (!r.usedApi && r.ok) return "Abra o WhatsApp para enviar o aviso ao cliente.";
  return "Não foi possível preparar o WhatsApp — confira o telefone do cliente.";
}

/**
 * Monta o texto com o link da área do cliente para anexar às mensagens de WhatsApp.
 * Busca primeiro no state local (rápido), depois no Supabase como fallback
 * (cobre agendamentos manuais onde customer_id pode ser nulo ou o cliente
 * não foi carregado por estar além do limite do Starter).
 */
async function getCustomerPortalText(appt: AppointmentRow): Promise<string | null> {
  // 1. Tenta no estado local
  const localCustomer =
    state.customers.find((item) => item.id === appt.customer_id) ||
    state.customers.find(
      (item) =>
        normalizePhone(item.phone) === normalizePhone(appt.client_phone) &&
        normalizeName(item.name) === normalizeName(appt.client_name)
    );

  if (localCustomer?.portal_token) {
    return `Acompanhe seus horários, aprove alterações e reagende quando precisar: ${getCustomerPortalUrl(localCustomer.portal_token)}`;
  }

  // 2. Fallback: consulta o Supabase (cobre limite do Starter e agendamentos manuais)
  if (!state.business?.id) return null;
  try {
    const token = await appointmentService.fetchPortalTokenByPhone(
      state.business.id,
      appt.client_phone
    );
    if (!token) return null;
    return `Acompanhe seus horários, aprove alterações e reagende quando precisar: ${getCustomerPortalUrl(token)}`;
  } catch {
    return null;
  }
}

async function notifyAppointmentConfirmed(appt: AppointmentRow): Promise<string> {
  const businessName = state.business?.name || "Nosso estabelecimento";
  const svc = findService(appt.service_id);
  const prof = findProfessional(appt.professional_id);
  const canAutomate = canUseAutomaticCustomerWhatsApp(state.business);
  const portalText = await getCustomerPortalText(appt);
  if (canAutomate) {
    const template = buildAppointmentConfirmationTemplateFromRow(
      appt,
      businessName,
      svc?.name || "Serviço",
      prof?.name || "",
      Number(svc?.price ?? 0)
    );
    if (template) {
      const templateResult = await sendWhatsAppTemplate(appt.client_phone, template);
      if (templateResult.ok) {
        if (portalText) {
          await sendWhatsAppText(appt.client_phone, portalText, { preferApi: true });
        }
        return "Confirmado. Mensagem enviada ao cliente (template WhatsApp).";
      }
    }
  }
  const msg = [
    buildAppointmentConfirmationFromRow(
      appt,
      businessName,
      svc?.name || "Serviço",
      prof?.name || "",
      Number(svc?.price ?? 0)
    ),
    portalText,
  ]
    .filter(Boolean)
    .join("\n\n");
  const r = await sendWhatsAppText(appt.client_phone, msg, { preferApi: canAutomate });
  if (r.usedApi && r.ok) return "Confirmado. Mensagem enviada ao cliente (WhatsApp API).";
  if (!r.usedApi && r.ok) return "Confirmado. Abra o WhatsApp para enviar a mensagem ao cliente.";
  return "Confirmado. Não foi possível abrir o WhatsApp — confira o telefone do cliente.";
}

async function notifyAppointmentRescheduled(appt: AppointmentRow): Promise<string> {
  const businessName = state.business?.name || "Nosso estabelecimento";
  const svc = findService(appt.service_id);
  const prof = findProfessional(appt.professional_id);
  const portalText = await getCustomerPortalText(appt);
  const msg = [
    buildAppointmentRescheduledFromRow(
      appt,
      businessName,
      svc?.name || "Serviço",
      prof?.name || "",
      Number(svc?.price ?? 0)
    ),
    portalText,
  ]
    .filter(Boolean)
    .join("\n\n");
  const r = await sendWhatsAppText(appt.client_phone, msg, { preferApi: canUseAutomaticCustomerWhatsApp(state.business) });
  if (r.usedApi && r.ok) return "Proposta de reagendamento enviada ao cliente (WhatsApp API).";
  if (!r.usedApi && r.ok) return "Reagendamento salvo. Abra o WhatsApp para enviar a proposta ao cliente.";
  return "Reagendamento salvo, mas não foi possível preparar a mensagem ao cliente.";
}

export async function updateAppointmentStatus(status: AppointmentStatus): Promise<void> {
  if (!state.selectedAppointment) return;
  const previousStatus = state.selectedAppointment.status;
  const snapshot: AppointmentRow = { ...state.selectedAppointment };
  if (previousStatus === status) {
    showToast("Esse agendamento já está nesse status.");
    return;
  }
  showLoading(true);
  try {
    const { error } = await appointmentService.updateAppointment(state.selectedAppointment.id, {
      status,
      client_reapproval_required: status === "pendente" ? snapshot.client_reapproval_required ?? false : false,
    });
    if (error) throw error;
    state.selectedAppointment = { ...snapshot, status };
    closeModal("modalApptDetail");
    await refreshAllBusinessData();
    let toastMsg = "Status atualizado com sucesso.";
    if (status === "confirmado" && previousStatus === "pendente") {
      toastMsg = await notifyAppointmentConfirmed(snapshot);
    } else if (status === "confirmado" && previousStatus === "concluido") {
      toastMsg = "Agendamento voltou para confirmado.";
    } else if (status === "cancelado" && previousStatus !== "cancelado") {
      const note = await notifyCustomerCancellation(snapshot, "status_cancelado");
      toastMsg = `Agendamento cancelado. ${note}`;
    } else if (status === "concluido" && previousStatus !== "concluido") {
      toastMsg = "Atendimento marcado como realizado.";
    }
    showToast(toastMsg);
  } catch (error) {
    console.error(error);
    showToast(getFriendlyAppointmentError(error));
  } finally {
    showLoading(false);
  }
}

export async function deleteAppointment(): Promise<void> {
  if (!state.selectedAppointment) return;
  const snapshot: AppointmentRow = { ...state.selectedAppointment };
  showLoading(true);
  try {
    const note = await notifyCustomerCancellation(snapshot, "deleted");
    await appointmentService.deleteAppointment(snapshot.id);
    closeModal("modalApptDetail");
    state.selectedAppointment = null;
    showToast(`Agendamento excluído. ${note}`);
    await refreshAllBusinessData();
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error));
  } finally {
    showLoading(false);
  }
}

function didAppointmentTimingChange(before: AppointmentRow, after: AppointmentRow): boolean {
  return (
    before.appointment_date !== after.appointment_date ||
    before.appointment_time !== after.appointment_time ||
    before.service_id !== after.service_id ||
    String(before.professional_id || "") !== String(after.professional_id || "")
  );
}

export function hasAppointmentBeenRescheduled(before: AppointmentRow, after: AppointmentRow): boolean {
  return didAppointmentTimingChange(before, after);
}

export async function notifyCustomerAboutReschedule(appt: AppointmentRow): Promise<string> {
  return notifyAppointmentRescheduled(appt);
}

export function confirmDeleteAppointment(): void {
  if (!state.selectedAppointment) return;
  openConfirmActionModal({
    title: "Excluir agendamento",
    message: `Deseja excluir o agendamento de "${state.selectedAppointment.client_name}"? Essa ação não poderá ser desfeita.`,
    confirmLabel: "Excluir agendamento",
    confirmClass: "btn btn-danger",
    onConfirm: deleteAppointment,
  });
}

export function openConfirmActionModal(opts: {
  title: string;
  message: string;
  confirmLabel?: string;
  confirmClass?: string;
  onConfirm: () => Promise<void>;
}): void {
  state.pendingConfirmAction = opts.onConfirm;
  const t = document.getElementById("confirmActionTitle");
  const m = document.getElementById("confirmActionMessage");
  if (t) t.textContent = opts.title;
  if (m) m.textContent = opts.message;
  const button = document.getElementById("confirmActionButton") as HTMLButtonElement | null;
  if (button) {
    button.textContent = opts.confirmLabel || "Confirmar";
    button.className = opts.confirmClass || "btn btn-danger";
  }
  openModal("modalConfirmAction");
}

export function closeConfirmActionModal(): void {
  state.pendingConfirmAction = null;
  closeModal("modalConfirmAction");
}

export async function runPendingConfirmAction(): Promise<void> {
  const action = state.pendingConfirmAction;
  closeConfirmActionModal();
  if (typeof action === "function") {
    await action();
  }
}