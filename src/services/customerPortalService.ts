import { getSupabase } from "../lib/supabase";
import type { AppointmentRow, Business, BusinessHourRow, CustomerPortalData, CustomerRow, ProfessionalRow, ServiceRow } from "../types";
import { normalizeBusinessHourRows } from "../utils/businessHours";

interface CustomerPortalRpcPayload {
  business: Business;
  customer: CustomerRow;
  appointments: AppointmentRow[];
  services: ServiceRow[];
  professionals: ProfessionalRow[];
  hours: BusinessHourRow[];
}

function mapPortalPayload(data: unknown): CustomerPortalData {
  const payload = (data || {}) as Partial<CustomerPortalRpcPayload>;
  return {
    business: payload.business as Business,
    customer: payload.customer as CustomerRow,
    appointments: (payload.appointments || []) as AppointmentRow[],
    services: (payload.services || []) as ServiceRow[],
    professionals: (payload.professionals || []) as ProfessionalRow[],
    hours: normalizeBusinessHourRows((payload.hours || []) as BusinessHourRow[]),
  };
}

export async function loadCustomerPortalByToken(portalToken: string): Promise<CustomerPortalData> {
  const { data, error } = await getSupabase().rpc("get_customer_portal", {
    p_portal_token: portalToken,
  });
  if (error) throw error;
  return mapPortalPayload(data);
}

export async function rescheduleCustomerPortalAppointment(params: {
  portalToken: string;
  appointmentId: string;
  appointmentDate: string;
  appointmentTime: string;
}): Promise<AppointmentRow> {
  const { data, error } = await getSupabase().rpc("reschedule_customer_portal_appointment", {
    p_portal_token: params.portalToken,
    p_appointment_id: params.appointmentId,
    p_appointment_date: params.appointmentDate,
    p_appointment_time: params.appointmentTime,
  });
  if (error) throw error;
  return ((data || {}) as { appointment?: AppointmentRow }).appointment as AppointmentRow;
}

export async function approveCustomerPortalAppointment(params: {
  portalToken: string;
  appointmentId: string;
}): Promise<AppointmentRow> {
  const { data, error } = await getSupabase().rpc("approve_customer_portal_appointment", {
    p_portal_token: params.portalToken,
    p_appointment_id: params.appointmentId,
  });
  if (error) throw error;
  return ((data || {}) as { appointment?: AppointmentRow }).appointment as AppointmentRow;
}
