import * as appointmentService from "../services/appointmentService";
import { generateTimeSlotsForDate } from "../utils/dates";
import { getErrorMessage, getFriendlyAppointmentError } from "../utils/errors";
import { formatLongDate, formatRecurrenceLabel } from "../utils/formatters";
import { onlyDigits } from "../utils/phone";
import { bookingState, pubStepHistory, setBookingState, state } from "../state/store";
import type { LastBookingPayload } from "../types";
import { emptyStateHtml } from "../ui/components/emptyState";
import { getPublicAppUrl, showLoading, showScreen, showToast, openModal } from "../ui/dom";
import { applyPublicData, getFallbackPublic, loadPublicData, resetPublicBookingFlow } from "./publicData";
import { fillSummary, renderDateScroll, renderPubProfs, renderPubServices } from "../ui/render/publicViews";

export function pubGoRaw(step: number): void {
  document.querySelectorAll("#publicShell .page").forEach((page) => {
    page.classList.remove("active");
    page.classList.add("hidden");
  });
  const success = document.getElementById("pubSuccess");
  if (success) {
    success.style.display = "none";
    success.classList.add("hidden");
  }

  const page = document.getElementById(`pubStep${step}`);
  if (page) {
    page.classList.remove("hidden");
    page.classList.add("active");
  }
}

export function pubGoStep(step: number): void {
  if (step === 1) {
    renderPubServices(bookingState.profId && bookingState.profId !== 0 ? String(bookingState.profId) : null);
  }
  if (step === 2) {
    renderPubProfs(bookingState.serviceId || null);
  }
  if (step === 3) {
    renderDateScroll();
    void renderTimeGrid();
  }
  if (step === 4) {
    fillSummary();
  }
  pubStepHistory.push(step);
  pubGoRaw(step);
}

export function pubBack(): void {
  if (pubStepHistory.length <= 1) {
    pubGoRaw(0);
    return;
  }
  pubStepHistory.pop();
  pubGoRaw(pubStepHistory[pubStepHistory.length - 1]!);
}

export function startBooking(mode: "service" | "prof"): void {
  resetPublicBookingFlow(mode);
  if (mode === "service") {
    renderPubServices();
    pubStepHistory.length = 0;
    pubStepHistory.push(0, 1);
    pubGoRaw(1);
    return;
  }
  renderPubProfs();
  pubStepHistory.length = 0;
  pubStepHistory.push(0, 2);
  pubGoRaw(2);
}

export function selectService(id: string): void {
  setBookingState({ ...bookingState, serviceId: id });
  document.querySelectorAll("#pubServiceList .service-card").forEach((card) => card.classList.remove("selected"));
  document.getElementById(`svc-${id}`)?.classList.add("selected");
  const btn = document.getElementById("btnNextFromService") as HTMLButtonElement | null;
  if (btn) btn.disabled = false;
}

export function selectProf(id: string): void {
  setBookingState({ ...bookingState, profId: id === "0" ? 0 : id });
  document.querySelectorAll("#pubProfList .prof-card").forEach((card) => card.classList.remove("selected"));
  document.getElementById(`prof-${id}`)?.classList.add("selected");
  const btn = document.getElementById("btnNextFromProf") as HTMLButtonElement | null;
  if (btn) btn.disabled = false;
}

export function goNextFromService(): void {
  if (!bookingState.serviceId) return;
  if (bookingState.mode === "prof" && bookingState.profId !== null) {
    pubGoStep(3);
    return;
  }
  renderPubProfs(bookingState.serviceId);
  pubGoStep(2);
}

export function goNextFromProf(): void {
  if (bookingState.mode === "prof" && !bookingState.serviceId) {
    renderPubServices(bookingState.profId === 0 ? null : String(bookingState.profId));
    pubGoStep(1);
    return;
  }
  pubGoStep(3);
}

export function selectDate(iso: string): void {
  setBookingState({ ...bookingState, date: iso, time: null });
  document.querySelectorAll(".date-btn").forEach((button) => button.classList.remove("selected"));
  const target = Array.from(document.querySelectorAll(".date-btn")).find(
    (button) => button.getAttribute("onclick") === `selectDate('${iso}')`
  );
  target?.classList.add("selected");
  const btn = document.getElementById("btnNextFromDateTime") as HTMLButtonElement | null;
  if (btn) btn.disabled = true;
  void renderTimeGrid();
}

export async function renderTimeGrid(): Promise<void> {
  const container = document.getElementById("timeGrid");
  if (!container) return;
  container.innerHTML = `<div class="text-sm text-sub">Carregando horarios...</div>`;

  if (!bookingState.date || !bookingState.serviceId) {
    container.innerHTML = emptyStateHtml("Escolha servico e data para ver horarios.");
    return;
  }

  const slots = generateTimeSlotsForDate(bookingState.date, state.publicData.hours);
  const professionalId = bookingState.profId === 0 ? null : (bookingState.profId as string | null);
  const availability = await Promise.all(
    slots.map(async (slot) => ({
      slot,
      available: state.publicData.business
        ? await appointmentService.isSlotAvailable({
            businessId: state.publicData.business.id,
            serviceId: bookingState.serviceId!,
            professionalId,
            date: bookingState.date!,
            time: slot,
          })
        : false,
    }))
  );

  if (!availability.length) {
    container.innerHTML = emptyStateHtml("Nao ha horarios disponiveis nessa data.");
    return;
  }

  container.innerHTML = availability
    .map(
      ({ slot, available }) => `
        <button class="time-btn" type="button" ${available ? "" : "disabled"} onclick="selectTime('${slot}')">${slot}</button>
      `
    )
    .join("");
}

export function selectTime(slot: string): void {
  setBookingState({ ...bookingState, time: slot });
  document.querySelectorAll(".time-btn").forEach((button) => button.classList.remove("selected"));
  const target = Array.from(document.querySelectorAll(".time-btn")).find((button) => button.textContent === slot);
  target?.classList.add("selected");
  const btn = document.getElementById("btnNextFromDateTime") as HTMLButtonElement | null;
  if (btn) btn.disabled = !bookingState.date || !bookingState.time;
}

export async function confirmBooking(): Promise<void> {
  const name = (document.getElementById("clientName") as HTMLInputElement).value.trim();
  const email = (document.getElementById("clientEmail") as HTMLInputElement).value.trim();
  const phone = (document.getElementById("clientPhone") as HTMLInputElement).value.trim();
  const notes = (document.getElementById("clientNotes") as HTMLTextAreaElement).value.trim();
  const recurrenceType = (document.getElementById("clientRecurrenceType") as HTMLSelectElement).value;
  const recurrenceCount = Number((document.getElementById("clientRecurrenceCount") as HTMLInputElement).value || 1);
  const service = state.publicData.services.find((item) => item.id === bookingState.serviceId);
  const professional =
    bookingState.profId && bookingState.profId !== 0
      ? state.publicData.professionals.find((item) => item.id === bookingState.profId)
      : undefined;

  if (!name || !phone || !bookingState.date || !bookingState.time || !service || !state.publicData.business) {
    showToast("Preencha seus dados e escolha um horario valido.");
    return;
  }

  showLoading(true);
  try {
    const { error } = await appointmentService.createPublicBooking({
      p_business_id: state.publicData.business.id,
      p_service_id: service.id,
      p_professional_id: professional?.id || null,
      p_client_name: name,
      p_client_phone: phone,
      p_client_email: email || null,
      p_client_notes: notes || null,
      p_appointment_date: bookingState.date,
      p_appointment_time: bookingState.time,
      p_recurrence_type: recurrenceType,
      p_occurrences: recurrenceType === "none" ? 1 : recurrenceCount,
    });
    if (error) throw error;

    document.querySelectorAll("#publicShell .page").forEach((page) => {
      page.classList.remove("active");
      page.classList.add("hidden");
    });

    const ss = document.getElementById("successService");
    const sp = document.getElementById("successProf");
    const sdt = document.getElementById("successDateTime");
    if (ss) ss.textContent = service.name;
    if (sp) sp.textContent = professional ? `${professional.emoji || "👤"} ${professional.name}` : "Primeiro disponivel";
    if (sdt) sdt.textContent = `${formatLongDate(bookingState.date)} as ${bookingState.time}`;

    const success = document.getElementById("pubSuccess");
    if (success) {
      success.classList.remove("hidden");
      success.style.display = "flex";
    }

    const payload: LastBookingPayload = {
      name,
      email,
      phone,
      notes,
      recurrenceType,
      recurrenceCount: recurrenceType === "none" ? 1 : recurrenceCount,
      service,
      professional,
      date: formatLongDate(bookingState.date),
      time: bookingState.time,
      business: state.publicData.business,
    };
    window._lastBooking = payload;
  } catch (error) {
    console.error(error);
    showToast(getFriendlyAppointmentError(error));
  } finally {
    showLoading(false);
  }
}

export function sendWAConfirmation(): void {
  const booking = window._lastBooking;
  if (!booking) return;
  const recurrenceLine =
    booking.recurrenceType && booking.recurrenceType !== "none"
      ? `Recorrencia: ${formatRecurrenceLabel(booking.recurrenceType)} (${booking.recurrenceCount} agendamentos)\n`
      : "";
  const message =
    `Ola, ${booking.name}! Seu agendamento foi reservado com sucesso em ${booking.business.name}.\n\n` +
    `Servico: ${booking.service.name}\n` +
    `Profissional: ${booking.professional ? booking.professional.name : "Primeiro disponivel"}\n` +
    `Data: ${booking.date}\n` +
    `Horario: ${booking.time}\n` +
    recurrenceLine +
    `Endereco: ${booking.business.address || "Nao informado"}\n\n` +
    `Se precisar remarcar, fale conosco pelo WhatsApp.`;
  window._waMsg = message;
  const el = document.getElementById("waMessageText");
  if (el) el.textContent = message;
  openModal("modalWAMsg");
}

export function copyWAMsg(): void {
  void navigator.clipboard.writeText(window._waMsg || "").then(() => showToast("Mensagem copiada."));
}

export function copyLink(): void {
  const link = document.getElementById("bizLink")?.textContent || "";
  void navigator.clipboard.writeText(link).then(() => showToast("Link copiado."));
}

export function shareWhatsApp(): void {
  const link = document.getElementById("bizLink")?.textContent || "";
  const text = encodeURIComponent(`Agende seu horario comigo: ${link}`);
  window.open(`https://wa.me/?text=${text}`, "_blank");
}

export function openHostedPublicPage(): void {
  if (!state.business?.slug) {
    showToast("Salve o negocio para gerar o link publico.");
    return;
  }
  window.open(getPublicAppUrl(state.business.slug), "_blank");
}

export async function showPublicBooking(): Promise<void> {
  showLoading(true);
  try {
    const slug = state.business?.slug || new URLSearchParams(window.location.search).get("slug");
    if (slug) {
      await loadPublicData(slug);
    } else {
      applyPublicData(getFallbackPublic());
    }
    showScreen("publicShell");
    pubGoRaw(0);
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error));
    applyPublicData(getFallbackPublic());
    showScreen("publicShell");
    pubGoRaw(0);
  } finally {
    showLoading(false);
  }
}

export function openBusinessWhatsApp(): void {
  const phone = onlyDigits(state.publicData.business?.whatsapp || "");
  if (!phone) {
    showToast("WhatsApp nao configurado.");
    return;
  }
  window.open(`https://wa.me/55${phone}`, "_blank");
}

export function openBusinessInstagram(): void {
  const handle = (state.publicData.business?.instagram || "").replace(/^@/, "");
  if (!handle) {
    showToast("Instagram nao configurado.");
    return;
  }
  window.open(`https://instagram.com/${handle}`, "_blank");
}
