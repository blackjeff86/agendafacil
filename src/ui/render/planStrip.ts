import {
  isProPlan,
  isStarterPlan,
  isTrialActive,
  isTrialExpired,
  resolvePlanTier,
  trialDaysRemaining,
} from "../../config/plans";
import { state } from "../../state/store";
import { formatCurrency } from "../../utils/formatters";

export function applyPlanNavVisibility(): void {
  const b = state.business;
  const pro = isProPlan(b);
  document.getElementById("navClientesItem")?.classList.toggle("hidden", !pro);
  document.getElementById("navRelatoriosItem")?.classList.toggle("hidden", !pro);
}

export function renderPlanStatusStrip(): void {
  const el = document.getElementById("planStatusStrip");
  if (!el) return;

  if (state.isPlatformAdmin || !state.business) {
    el.classList.add("hidden");
    el.innerHTML = "";
    document.body.classList.remove("has-plan-strip");
    return;
  }

  const b = state.business;
  const tier = resolvePlanTier(b);
  const days = trialDaysRemaining(b);
  const trialOn = isTrialActive(b);
  const expired = isTrialExpired(b);

  const parts: string[] = [];

  if (trialOn && days !== null) {
    const label = days === 1 ? "1 dia restante" : `${days} dias restantes`;
    parts.push(`<span class="plan-status-pill plan-status-trial">Teste grátis · ${label}</span>`);
  } else if (expired) {
    parts.push(`<span class="plan-status-pill plan-status-warn">Teste encerrado · escolha um plano</span>`);
  }

  if (tier === "starter") {
    parts.push(`<span class="plan-status-pill">Plano Starter</span>`);
    parts.push(
      `<button type="button" class="plan-status-link" onclick="openPlanUpgradeModal()">Fazer upgrade Pro · ${formatCurrency(59.9)}/mês</button>`
    );
  } else {
    parts.push(`<span class="plan-status-pill plan-status-pro">Plano Pro</span>`);
  }

  el.innerHTML = `<div class="plan-status-inner">${parts.join("")}</div>`;
  el.classList.remove("hidden");
  document.body.classList.add("has-plan-strip");
}

export function renderProfissionaisPlanHint(): void {
  const host = document.getElementById("profissionaisPlanHint");
  if (!host || !state.business || state.isPlatformAdmin) {
    host?.classList.add("hidden");
    return;
  }
  if (!isStarterPlan(state.business)) {
    host.classList.add("hidden");
    return;
  }
  host.classList.remove("hidden");
  host.innerHTML = `<div class="card card-sm plan-hint-card"><strong>Plano Starter</strong><span class="text-sm text-sub">Inclui até <strong>1 profissional ativo</strong>. No Pro você adiciona a equipe completa.</span></div>`;
}

export function renderReportsPage(): void {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const list = state.appointments.filter((a) => a.appointment_date.startsWith(prefix) && a.status !== "cancelado");
  const revenue = list.reduce((sum, a) => {
    const svc = state.services.find((s) => s.id === a.service_id);
    return sum + (svc?.price || 0);
  }, 0);

  const set = (id: string, v: string) => {
    const n = document.getElementById(id);
    if (n) n.textContent = v;
  };
  set("reportsMonthLabel", now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }));
  set("reportsApptCount", String(list.length));
  set("reportsRevenue", formatCurrency(revenue));
}
