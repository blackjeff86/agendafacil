import { getSupabase } from "../lib/supabase";
import type { AppointmentRow } from "../types";

export async function insertAppointment(payload: Record<string, unknown>) {
  return getSupabase().from("appointments").insert(payload);
}

export async function updateAppointment(appointmentId: string, payload: Record<string, unknown>) {
  return getSupabase().from("appointments").update(payload).eq("id", appointmentId);
}

export async function deleteAppointment(appointmentId: string) {
  const { error } = await getSupabase().from("appointments").delete().eq("id", appointmentId);
  if (error) throw error;
}

export async function isSlotAvailable(params: {
  businessId: string;
  serviceId: string;
  professionalId: string | null;
  date: string;
  time: string;
  /** Ao reagendar, ignora o próprio agendamento na checagem de conflito. */
  excludeAppointmentId?: string | null;
}): Promise<boolean> {
  const { data, error } = await getSupabase().rpc("is_slot_available", {
    p_business_id: params.businessId,
    p_service_id: params.serviceId,
    p_professional_id: params.professionalId,
    p_date: params.date,
    p_time: params.time,
    p_exclude_appointment_id: params.excludeAppointmentId ?? null,
  });
  if (error) {
    console.error(error);
    return false;
  }
  return Boolean(data);
}

export async function createPublicBooking(params: Record<string, unknown>) {
  return getSupabase().rpc("create_public_booking", params);
}

export async function updateAppointmentSeriesRpc(params: Record<string, unknown>) {
  return getSupabase().rpc("update_appointment_series", params);
}

export async function deleteAppointmentSeriesRpc(seriesId: string) {
  return getSupabase().rpc("delete_appointment_series", { p_series_id: seriesId });
}

export async function getPublicClientSnapshot(params: { slug: string; phoneDigits: string }) {
  return getSupabase().rpc("get_public_client_snapshot", {
    p_slug: params.slug,
    p_phone_digits: params.phoneDigits,
  });
}

export async function getPublicClientSnapshotByToken(params: { slug: string; portalToken: string }) {
  return getSupabase().rpc("get_public_client_snapshot_by_token", {
    p_slug: params.slug,
    p_token: params.portalToken,
  });
}

export async function reschedulePublicAppointment(params: {
  appointmentId: string;
  phoneDigits: string;
  date: string;
  time: string;
  professionalId: string | null;
}) {
  return getSupabase().rpc("reschedule_public_appointment", {
    p_appointment_id: params.appointmentId,
    p_phone_digits: params.phoneDigits,
    p_date: params.date,
    p_time: params.time,
    p_professional_id: params.professionalId,
  });
}

export async function reschedulePublicAppointmentByToken(params: {
  appointmentId: string;
  portalToken: string;
  date: string;
  time: string;
  professionalId: string | null;
}) {
  return getSupabase().rpc("reschedule_public_appointment_by_token", {
    p_appointment_id: params.appointmentId,
    p_portal_token: params.portalToken,
    p_date: params.date,
    p_time: params.time,
    p_professional_id: params.professionalId,
  });
}

export function mapAppointmentRows(data: unknown): AppointmentRow[] {
  return (data ?? []) as AppointmentRow[];
}
