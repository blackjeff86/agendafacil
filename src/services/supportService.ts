import { getSupabase } from "../lib/supabase";
import type { Business, CustomerRow, SupportEventRow } from "../types";

export async function fetchAllBusinesses(): Promise<Business[]> {
  const { data, error } = await getSupabase().from("businesses").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Business[];
}

export async function fetchSupportEventsForBusinessIds(businessIds: string[]): Promise<SupportEventRow[]> {
  if (!businessIds.length) return [];
  const { data, error } = await getSupabase()
    .from("support_events")
    .select("*")
    .in("business_id", businessIds)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("Support events unavailable:", error.message);
    return [];
  }
  return (data ?? []) as SupportEventRow[];
}

export async function insertSupportEvent(payload: Record<string, unknown>) {
  return getSupabase().from("support_events").insert(payload);
}

export async function fetchCustomersForBusinessLimited(businessId: string, limit = 6): Promise<CustomerRow[]> {
  const { data, error } = await getSupabase()
    .from("customers")
    .select("*")
    .eq("business_id", businessId)
    .order("last_booking_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as CustomerRow[];
}
