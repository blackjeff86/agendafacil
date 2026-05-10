import { state } from "./store";
import type { AppointmentSeriesRow, ProfessionalRow, ServiceRow } from "../types";

export function findService(id: string | null | undefined): ServiceRow | undefined {
  if (!id) return undefined;
  return state.services.find((item) => item.id === id) || state.publicData.services.find((item) => item.id === id);
}

export function findProfessional(id: string | null | undefined): ProfessionalRow | undefined {
  if (!id) return undefined;
  return state.professionals.find((item) => item.id === id) || state.publicData.professionals.find((item) => item.id === id);
}

export function findSeries(seriesId: string): AppointmentSeriesRow | null {
  return state.appointmentSeries.find((item) => item.id === seriesId) || null;
}
