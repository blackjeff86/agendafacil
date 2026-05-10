import type { Business } from "../types";

export type PlanTier = "starter" | "pro";

export const TRIAL_DAYS = 7;

/** Contas antigas sem plan_tier: tratamos como Pro para não bloquear quem já usava o sistema. */
export function resolvePlanTier(business: Business | null | undefined): PlanTier {
  if (!business?.plan_tier) return "pro";
  return business.plan_tier === "pro" ? "pro" : "starter";
}

export function isProPlan(business: Business | null | undefined): boolean {
  return resolvePlanTier(business) === "pro";
}

export function isStarterPlan(business: Business | null | undefined): boolean {
  return resolvePlanTier(business) === "starter";
}

/** Dias completos restantes no trial (1 = último dia). Null se não há trial ativo. */
export function trialDaysRemaining(business: Business | null | undefined): number | null {
  if (!business?.trial_ends_at || business.billing_status !== "trial") return null;
  const end = new Date(business.trial_ends_at).getTime();
  const now = Date.now();
  if (Number.isNaN(end) || end <= now) return null;
  return Math.ceil((end - now) / 86400000);
}

export function isTrialActive(business: Business | null | undefined): boolean {
  return trialDaysRemaining(business) !== null;
}

export function isTrialExpired(business: Business | null | undefined): boolean {
  if (!business?.trial_ends_at || business.billing_status !== "trial") return false;
  return new Date(business.trial_ends_at).getTime() <= Date.now();
}

export function maxActiveProfessionals(business: Business | null | undefined): number {
  return isProPlan(business) ? 99 : 1;
}

export function canAccessCustomersModule(business: Business | null | undefined): boolean {
  return isProPlan(business);
}

export function canAccessReportsModule(business: Business | null | undefined): boolean {
  return isProPlan(business);
}

export function countActiveProfessionals(professionals: { active: boolean }[]): number {
  return professionals.filter((p) => p.active).length;
}
