import { buildFallbackPublic } from "../constants/fallbackPublic";
import * as publicBookingService from "../services/publicBookingService";
import { setBookingState, setPubStepHistory, state } from "../state/store";
import type { BookingState, ProfessionalRow, PublicData } from "../types";
import { renderPublicLanding } from "../ui/render/publicViews";

export function resetPublicBookingFlow(mode: BookingState["mode"] = "service"): void {
  setBookingState({
    mode,
    serviceId: null,
    profId: null,
    date: null,
    time: null,
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
  document.getElementById("clientRecurrenceCountGroup")?.classList.toggle("hidden", type === "none");
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

export function getFallbackPublic(): PublicData {
  return buildFallbackPublic();
}
