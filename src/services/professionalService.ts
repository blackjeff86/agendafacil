import { getSupabase } from "../lib/supabase";

export async function insertProfessional(payload: Record<string, unknown>) {
  return getSupabase().from("professionals").insert(payload).select().single();
}

export async function updateProfessional(professionalId: string, payload: Record<string, unknown>) {
  return getSupabase().from("professionals").update(payload).eq("id", professionalId).select().single();
}

export async function deleteProfessionalServiceLinks(professionalId: string) {
  const { error } = await getSupabase().from("professional_services").delete().eq("professional_id", professionalId);
  if (error) throw error;
}

export async function insertProfessionalServiceLinks(rows: { professional_id: string; service_id: string }[]) {
  if (!rows.length) return;
  const { error } = await getSupabase().from("professional_services").insert(rows);
  if (error) throw error;
}

export async function setProfessionalActive(professionalId: string, active: boolean) {
  const { error } = await getSupabase().from("professionals").update({ active }).eq("id", professionalId);
  if (error) throw error;
}
