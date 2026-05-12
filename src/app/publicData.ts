import { buildFallbackPublic } from "../constants/fallbackPublic";
import * as customerPortalService from "../services/customerPortalService";
import * as publicBookingService from "../services/publicBookingService";
import { bookingState, setBookingState, setPubStepHistory, state } from "../state/store";
import type { BookingState, CustomerPortalData, ProfessionalRow, PublicData } from "../types";
import { renderPublicLanding, renderSecondDateScroll } from "../ui/render/publicViews";

export function resetPublicBookingFlow(mode: BookingState["mode"] = "service"): void {
  setBookingState({
    mode,
    serviceId: null,
    profId: null,
    date: null,
    time: null,
    secondDate: null,
    secondTime: null,
  });
  setPubStepHistory([0]);
  const cn = document.getElementById("clientName") as HTMLInputElement | null;
  const ce = document.getElementById("clientEmail") as HTMLInputElement | null;
  const cp = document.getElementById("clientPhone") as HTMLInputElement | null;
  const crt = document.getElementById("clientRecurrenceType") as HTMLSelectElement | null;
  const crc = document.getElementById("clientRecurrenceCount") as HTMLInputElement | null;
  const notes = document.getElementById("clientNotes") as HTMLTextAreaElement | null;
  if (cn) cn.value = "";
  if (ce) ce.value = "";
  if (cp) cp.value = "";
  if (crt) crt.value = "none";
  if (crc) crc.value = "4";
  if (notes) notes.value = "";
  toggleRecurrenceFields();
  const b1 = document.getElementById("btnNextFromService") as HTMLButtonElement | null;
  const b2 = document.getElementById("btnNextFromProf") as HTMLButtonElement | null;
  const b3 = document.getElementById("btnNextFromDateTime") as HTMLButtonElement | null;
  if (b1) b1.disabled = true;
  if (b2) b2.disabled = true;
  if (b3) b3.disabled = true;
}

export function toggleRecurrenceFields(): void {
  const type = (document.getElementById("clientRecurrenceType") as HTMLSelectElement | null)?.value || "none";
  const group = document.getElementById("clientRecurrenceCountGroup");
  const secondGroup = document.getElementById("clientSecondWeeklyGroup");
  const label = document.getElementById("clientRecurrenceCountLabel");
  const hint = document.getElementById("clientRecurrenceCountHint");
  const input = document.getElementById("clientRecurrenceCount") as HTMLInputElement | null;

  group?.classList.toggle("hidden", type === "none");
  secondGroup?.classList.toggle("hidden", type !== "twice_weekly");
  if (type !== "twice_weekly") {
    setBookingState({ ...bookingState, secondDate: null, secondTime: null });
    const secondGrid = document.getElementById("secondTimeGrid");
    if (secondGrid) secondGrid.innerHTML = "";
  } else {
    renderSecondDateScroll();
  }
  if (!label || !hint || !input || type === "none") return;

  if (type === "weekly") {
    label.textContent = "Por quantas semanas?";
    hint.textContent = "Ex.: 4 semanas = 4 agendamentos, um por semana.";
    input.min = "2";
    input.max = "12";
    if (!input.value || Number(input.value) < 2) input.value = "4";
    return;
  }

  if (type === "twice_weekly") {
    label.textContent = "Por quantas semanas?";
    hint.textContent = "Ex.: 4 semanas = 8 agendamentos, dois por semana.";
    input.min = "2";
    input.max = "12";
    if (!input.value || Number(input.value) < 2) input.value = "4";
    return;
  }

  label.textContent = "Por quantos meses?";
  hint.textContent = "Ex.: 3 meses = 3 agendamentos, um por mês.";
  input.min = "2";
  input.max = "12";
  if (!input.value || Number(input.value) < 2) input.value = "3";
}

export function applyPublicData(publicData: PublicData): void {
  const professionals: ProfessionalRow[] = publicData.professionals.map((professional) => ({
    ...professional,
    serviceIds:
      professional.serviceIds ||
      (professional.serviceNames
        ?.map((name) => publicData.services.find((service) => service.name === name)?.id)
        .filter(Boolean) as string[]) ||
      [],
  }));

  state.publicData = {
    business: publicData.business,
    services: publicData.services,
    professionals,
    hours: publicData.hours,
  };
  resetPublicBookingFlow("service");
  renderPublicLanding();
}

export async function loadPublicData(slug: string): Promise<void> {
  const bundle = await publicBookingService.loadPublicWorkspaceBySlug(slug);
  applyPublicData({
    business: bundle.business,
    services: bundle.services,
    professionals: bundle.professionals,
    hours: bundle.hours,
  });
}

export function applyCustomerPortalData(data: CustomerPortalData): void {
  state.publicCustomerPortal = data;
  state.customerPortalSelectedDate = null;
  state.customerPortalStatusFilter = "todos";
  state.customerPortalSelectedAppointmentId = null;
}

export async function loadCustomerPortalData(portalToken: string): Promise<void> {
  const bundle = await customerPortalService.loadCustomerPortalByToken(portalToken);
  applyCustomerPortalData(bundle);
}

export function getFallbackPublic(): PublicData {
  return buildFallbackPublic();
}
