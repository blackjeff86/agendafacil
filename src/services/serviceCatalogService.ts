import { getSupabase } from "../lib/supabase";

export async function insertService(payload: Record<string, unknown>) {
  return getSupabase().from("services").insert(payload);
}

export async function updateService(serviceId: string, payload: Record<string, unknown>) {
  return getSupabase().from("services").update(payload).eq("id", serviceId);
}

export async function setServiceActive(serviceId: string, active: boolean) {
  const { error } = await getSupabase().from("services").update({ active }).eq("id", serviceId);
  if (error) throw error;
}

export async function listServiceIdNameForBusiness(businessId: string): Promise<{ id: string; name: string }[]> {
  const { data, error } = await getSupabase()
    .from("services")
    .select("id,name")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as { id: string; name: string }[];
}
