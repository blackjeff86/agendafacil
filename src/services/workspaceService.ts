import { getSupabase } from "../lib/supabase";
import { getCustomerManagementLimit, isStarterPlan } from "../config/plans";
import { normalizeBusinessHourRows } from "../utils/businessHours";
import type { Business } from "../types";
import type {
  AppointmentRow,
  AppointmentSeriesRow,
  BusinessHourRow,
  CustomerRow,
  ProfessionalRow,
  ProfessionalServiceRow,
  ServiceRow,
} from "../types";

export interface WorkspaceBundle {
  services: ServiceRow[];
  professionals: ProfessionalRow[];
  customers: CustomerRow[];
  appointmentSeries: AppointmentSeriesRow[];
  appointments: AppointmentRow[];
  hours: BusinessHourRow[];
  professionalServices: ProfessionalServiceRow[];
}

interface WorkspaceLoadOptions {
  business?: Business | null;
}

export async function loadWorkspaceForBusiness(businessId: string, options: WorkspaceLoadOptions = {}): Promise<WorkspaceBundle> {
  const sb = getSupabase();
  let customersQuery = sb.from("customers").select("*").eq("business_id", businessId).order("last_booking_at", { ascending: false });
  if (options.business && isStarterPlan(options.business)) {
    customersQuery = customersQuery.limit(getCustomerManagementLimit(options.business));
  }

  const [servicesResult, professionalsResult, customersResult, seriesResult, appointmentsResult, hoursResult] = await Promise.all([
    sb.from("services").select("*").eq("business_id", businessId).order("created_at", { ascending: true }),
    sb.from("professionals").select("*").eq("business_id", businessId).order("created_at", { ascending: true }),
    customersQuery,
    sb.from("appointment_series").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
    sb
      .from("appointments")
      .select("*")
      .eq("business_id", businessId)
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true }),
    sb.from("business_hours").select("*").eq("business_id", businessId).order("day_of_week", { ascending: true }),
  ]);

  if (servicesResult.error) throw servicesResult.error;
  if (professionalsResult.error) throw professionalsResult.error;
  if (customersResult.error) throw customersResult.error;
  if (seriesResult.error) throw seriesResult.error;
  if (appointmentsResult.error) throw appointmentsResult.error;
  if (hoursResult.error) throw hoursResult.error;

  const professionals = (professionalsResult.data ?? []) as ProfessionalRow[];
  const professionalIds = professionals.map((item) => item.id);
  let professionalServices: ProfessionalServiceRow[] = [];
  if (professionalIds.length) {
    const freshProfessionalServices = await sb
      .from("professional_services")
      .select("professional_id, service_id")
      .in("professional_id", professionalIds);
    if (freshProfessionalServices.error) throw freshProfessionalServices.error;
    professionalServices = (freshProfessionalServices.data ?? []) as ProfessionalServiceRow[];
  }

  return {
    services: (servicesResult.data ?? []) as ServiceRow[],
    professionals,
    customers: (customersResult.data ?? []) as CustomerRow[],
    appointmentSeries: (seriesResult.data ?? []) as AppointmentSeriesRow[],
    appointments: (appointmentsResult.data ?? []) as AppointmentRow[],
    hours: normalizeBusinessHourRows((hoursResult.data ?? []) as BusinessHourRow[]),
    professionalServices,
  };
}
