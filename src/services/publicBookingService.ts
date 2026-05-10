import { getSupabase } from "../lib/supabase";
import type { Business, BusinessHourRow, ProfessionalRow, ServiceRow } from "../types";

export interface PublicBundle {
  business: Business;
  services: ServiceRow[];
  professionals: ProfessionalRow[];
  hours: BusinessHourRow[];
}

export async function loadPublicWorkspaceBySlug(slug: string): Promise<PublicBundle> {
  const sb = getSupabase();
  const business = await (async () => {
    const { data, error } = await sb.from("businesses").select("*").eq("slug", slug).eq("active", true).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Negocio nao encontrado para esse link.");
    return data as Business;
  })();

  const [servicesResult, professionalsResult, hoursResult] = await Promise.all([
    sb.from("services").select("*").eq("business_id", business.id).eq("active", true).order("created_at", { ascending: true }),
    sb.from("professionals").select("*").eq("business_id", business.id).eq("active", true).order("created_at", { ascending: true }),
    sb.from("business_hours").select("*").eq("business_id", business.id).order("day_of_week", { ascending: true }),
  ]);

  if (servicesResult.error) throw servicesResult.error;
  if (professionalsResult.error) throw professionalsResult.error;
  if (hoursResult.error) throw hoursResult.error;

  const professionalsRaw = (professionalsResult.data ?? []) as ProfessionalRow[];
  const professionalIds = professionalsRaw.map((item) => item.id);
  let professionalServices: { professional_id: string; service_id: string }[] = [];
  if (professionalIds.length) {
    const professionalServicesResult = await sb
      .from("professional_services")
      .select("professional_id, service_id")
      .in("professional_id", professionalIds);
    if (professionalServicesResult.error) throw professionalServicesResult.error;
    professionalServices = professionalServicesResult.data ?? [];
  }

  const professionals: ProfessionalRow[] = professionalsRaw.map((professional) => ({
    ...professional,
    serviceIds: professionalServices.filter((item) => item.professional_id === professional.id).map((item) => item.service_id),
  }));

  return {
    business,
    services: (servicesResult.data ?? []) as ServiceRow[],
    professionals,
    hours: (hoursResult.data ?? []) as BusinessHourRow[],
  };
}
