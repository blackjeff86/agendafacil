import { TRIAL_DAYS } from "../config/plans";
import { DEFAULT_HOURS, DEFAULT_PROFESSIONALS, DEFAULT_SERVICES } from "../constants/defaults";
import { getSupabase } from "../lib/supabase";
import type { Business, PendingBusinessDraft } from "../types";

export async function fetchBusinessByOwner(ownerId: string): Promise<Business | null> {
  const { data, error } = await getSupabase()
    .from("businesses")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Business | null;
}

export async function insertBusiness(payload: Record<string, unknown>): Promise<Business> {
  const { data, error } = await getSupabase().from("businesses").insert(payload).select().single();
  if (error) throw error;
  return data as Business;
}

export async function updateBusiness(businessId: string, payload: Record<string, unknown>) {
  const { error } = await getSupabase().from("businesses").update(payload).eq("id", businessId);
  if (error) throw error;
}

export async function fetchBusinessBySlugPublic(slug: string): Promise<Business | null> {
  const { data, error } = await getSupabase()
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  return data as Business | null;
}

export async function upsertBusinessHours(rows: Record<string, unknown>[]) {
  const { error } = await getSupabase().from("business_hours").upsert(rows, { onConflict: "business_id,day_of_week" });
  if (error) throw error;
}

export async function seedBusinessDefaults(businessId: string): Promise<void> {
  const sb = getSupabase();
  const existing = await sb.from("services").select("id").eq("business_id", businessId).limit(1);
  if (existing.error) throw existing.error;
  if ((existing.data ?? []).length) return;

  const { data: services, error: servicesError } = await sb
    .from("services")
    .insert(DEFAULT_SERVICES.map((service) => ({ ...service, business_id: businessId })))
    .select();
  if (servicesError) throw servicesError;

  const { data: professionals, error: professionalsError } = await sb
    .from("professionals")
    .insert(DEFAULT_PROFESSIONALS.map(({ serviceNames: _sn, ...professional }) => ({ ...professional, business_id: businessId })))
    .select();
  if (professionalsError) throw professionalsError;

  const serviceByName = Object.fromEntries((services ?? []).map((s: { name: string; id: string }) => [s.name, s.id]));
  const professionalByName = Object.fromEntries((professionals ?? []).map((p: { name: string; id: string }) => [p.name, p.id]));
  const pivotRows = DEFAULT_PROFESSIONALS.flatMap((professional) =>
    professional.serviceNames.map((serviceName) => ({
      professional_id: professionalByName[professional.name],
      service_id: serviceByName[serviceName],
    }))
  );

  if (pivotRows.length) {
    const { error: pivotError } = await sb.from("professional_services").insert(pivotRows);
    if (pivotError) throw pivotError;
  }

  const { error: hoursError } = await sb
    .from("business_hours")
    .insert(DEFAULT_HOURS.map((hour) => ({ ...hour, business_id: businessId })));
  if (hoursError) throw hoursError;
}

export function buildNewBusinessPayload(userId: string, userEmail: string | undefined, draft: PendingBusinessDraft): Record<string, unknown> {
  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + TRIAL_DAYS);
  return {
    owner_id: userId,
    owner_email: draft.email || userEmail || "",
    name: draft.name,
    slug: draft.slug,
    category: draft.category || "Salao de Beleza",
    description: draft.description || "Atendimento profissional com agendamento online.",
    whatsapp: draft.whatsapp || "",
    instagram: draft.instagram || "",
    address: draft.address || "",
    logo_emoji: draft.logo_emoji || "✂️",
    logo_image_url: draft.logo_image_url || "",
    cover_image_url: draft.cover_image_url || "",
    plan_name: draft.plan_name || "Plano Starter",
    plan_tier: "starter",
    billing_status: draft.billing_status || "trial",
    trial_ends_at: trialEnds.toISOString(),
    next_billing_at: trialEnds.toISOString(),
    active: true,
  };
}
