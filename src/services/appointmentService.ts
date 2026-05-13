import { getSupabase } from "../lib/supabase";
import type { AppointmentRow, CustomerRow } from "../types";

export async function insertAppointment(payload: Record<string, unknown>) {
  return getSupabase().from("appointments").insert(payload).select().single();
}

export async function updateAppointment(appointmentId: string, payload: Record<string, unknown>) {
  return getSupabase().from("appointments").update(payload).eq("id", appointmentId);
}

export async function deleteAppointment(appointmentId: string) {
  const { error } = await getSupabase().from("appointments").delete().eq("id", appointmentId);
  if (error) throw error;
}

function normalizeName(value: string): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizePhone(value: string): string {
  return String(value || "").replace(/\D/g, "");
}

export async function ensureCustomerRecord(params: {
  businessId: string;
  customerId?: string | null;
  name: string;
  email?: string | null;
  phone: string;
}): Promise<CustomerRow | null> {
  const sb = getSupabase();
  const normalizedPhone = normalizePhone(params.phone);
  if (!normalizedPhone || !params.name.trim()) return null;

  if (params.customerId) {
    const { data } = await sb.from("customers").select("*").eq("id", params.customerId).maybeSingle();
    if (data) {
      if (data.portal_token) return data as CustomerRow;
      const portalToken = crypto.randomUUID().replace(/-/g, "");
      const { data: updated } = await sb
        .from("customers")
        .update({ portal_token: portalToken, email: params.email || data.email || null, phone: params.phone, name: params.name, updated_at: new Date().toISOString() })
        .eq("id", params.customerId)
        .select("*")
        .single();
      return (updated as CustomerRow) || ({ ...data, portal_token: portalToken } as CustomerRow);
    }
  }

  const { data: candidates } = await sb.from("customers").select("*").eq("business_id", params.businessId).eq("phone", params.phone);
  const matched = (candidates || []).find((item) => normalizeName(item.name) === normalizeName(params.name)) as CustomerRow | undefined;
  if (matched) {
    if (matched.portal_token) return matched;
    const portalToken = crypto.randomUUID().replace(/-/g, "");
    const { data: updated } = await sb
      .from("customers")
      .update({ portal_token: portalToken, email: params.email || matched.email || null, updated_at: new Date().toISOString() })
      .eq("id", matched.id)
      .select("*")
      .single();
    return (updated as CustomerRow) || ({ ...matched, portal_token: portalToken } as CustomerRow);
  }

  const portalToken = crypto.randomUUID().replace(/-/g, "");
  const { data: inserted, error } = await sb
    .from("customers")
    .insert({
      business_id: params.businessId,
      name: params.name,
      email: params.email || null,
      phone: params.phone,
      portal_token: portalToken,
      last_booking_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return (inserted as CustomerRow) || null;
}

export async function isSlotAvailable(params: {
  businessId: string;
  serviceId: string;
  professionalId: string | null;
  date: string;
  time: string;
}): Promise<boolean> {
  const { data, error } = await getSupabase().rpc("is_slot_available", {
    p_business_id: params.businessId,
    p_service_id: params.serviceId,
    p_professional_id: params.professionalId,
    p_date: params.date,
    p_time: params.time,
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

export function mapAppointmentRows(data: unknown): AppointmentRow[] {
  return (data ?? []) as AppointmentRow[];
}

/**
 * Busca o portal_token de um cliente pelo telefone e business_id.
 * Útil quando o agendamento foi criado manualmente (sem customer_id)
 * e o cliente não está carregado em state.customers.
 */
export async function fetchPortalTokenByPhone(
  businessId: string,
  phone: string
): Promise<string | null> {
  const digits = normalizePhone(phone);
  if (!digits) return null;

  const { data, error } = await getSupabase()
    .from("customers")
    .select("portal_token, phone")
    .eq("business_id", businessId)
    .not("portal_token", "is", null)
    .limit(50);

  if (error) return null;

  const match = (data ?? []).find(
    (row: { portal_token: string | null; phone: string }) =>
      row.portal_token && normalizePhone(row.phone) === digits
  );
  return (match as { portal_token: string } | undefined)?.portal_token ?? null;
}