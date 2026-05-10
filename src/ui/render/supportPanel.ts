import {
  formatSupportDueLine,
  formatSupportTrialSummary,
  getMonthlyPriceForBusiness,
  getPaymentDueDate,
  isInRenewalWindow,
  planDisplayLabel,
  sumEstimatedMonthlyRevenue,
} from "../../config/billing";
import { AGENDAFACIL_PIX_KEY, RENEWAL_REMINDER_WINDOW_DAYS, SUPPORT_PAGE_SIZE } from "../../config/env";
import { escapeHtml } from "../../utils/strings";
import {
  formatBillingLabel,
  formatCurrency,
  formatMonthYear,
  formatTimelineDate,
  normalizePlanName,
} from "../../utils/formatters";
import { state } from "../../state/store";
import type { Business } from "../../types";
import { emptyStateHtml } from "../components/emptyState";
import { SUPPORT_ACCOUNT_EMAIL } from "../../config/env";

export function isSupportAccountEmail(email?: string | null): boolean {
  return String(email || "").trim().toLowerCase() === SUPPORT_ACCOUNT_EMAIL;
}

export function isSupportInternalBusiness(business: Business | undefined | null): boolean {
  return isSupportAccountEmail(business?.owner_email);
}

export function getSupportEventsForBusiness(businessId: string) {
  return state.supportEvents.filter((event) => event.business_id === businessId);
}

export function renderSupportTimeline(businessId: string): void {
  const container = document.getElementById("supportTimelineList");
  if (!container) return;
  const events = getSupportEventsForBusiness(businessId);
  container.innerHTML = events.length
    ? events
        .slice(0, 12)
        .map(
          (event) => `
            <div class="support-timeline-item">
              <div class="support-timeline-dot"></div>
              <div class="support-timeline-content">
                <div class="support-timeline-title">${escapeHtml(event.title)}</div>
                <div class="support-timeline-meta">${formatTimelineDate(event.created_at)} · ${escapeHtml(event.actor_email || "Sistema")}</div>
                ${event.details ? `<div class="support-timeline-details">${escapeHtml(event.details)}</div>` : ""}
              </div>
            </div>`
        )
        .join("")
    : `<div class="empty-state">Ainda não há histórico de suporte para esta loja.</div>`;
}

export function renderSupportBusinesses(): void {
  if (!state.isPlatformAdmin) return;
  const searchInput = document.getElementById("supportSearch");
  const search = searchInput instanceof HTMLInputElement ? searchInput.value.trim().toLowerCase() : "";
  const filtered = state.supportBusinesses.filter((business) => {
    const haystack = [business.name, business.slug, business.owner_email, business.whatsapp].join(" ").toLowerCase();
    const matchesSearch = haystack.includes(search);
    const matchesFilter =
      state.supportFilter === "todos" ||
      (state.supportFilter === "ativas" && business.active) ||
      (state.supportFilter === "bloqueadas" && !business.active) ||
      (state.supportFilter === "sem_email" && !business.owner_email);
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / SUPPORT_PAGE_SIZE));
  state.supportPage = Math.min(state.supportPage, totalPages);
  const start = (state.supportPage - 1) * SUPPORT_PAGE_SIZE;
  const paginated = filtered.slice(start, start + SUPPORT_PAGE_SIZE);

  const setText = (id: string, v: string) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };

  setText("supportTotalBusinesses", String(state.supportBusinesses.length));
  setText("supportActiveBusinesses", String(state.supportBusinesses.filter((item) => item.active).length));
  setText("supportBlockedBusinesses", String(state.supportBusinesses.filter((item) => !item.active).length));
  setText("supportNoEmailBusinesses", String(state.supportBusinesses.filter((item) => !item.owner_email).length));
  setText("supportEstimatedMrr", formatCurrency(sumEstimatedMonthlyRevenue(state.supportBusinesses)));
  setText("supportResultsLabel", `${filtered.length} resultado(s) encontrado(s)`);

  const list = document.getElementById("supportBusinessList");
  if (list) {
    list.innerHTML = paginated.length
      ? paginated
          .map(
            (business) => `
            <div class="support-business-card ${business.active ? "" : "soft-inactive"}">
              <div class="support-business-top">
                <div>
                  <div class="font-bold support-business-name">${business.name}</div>
                  <div class="support-business-meta">${business.category || "Salão"} · desde ${formatMonthYear(business.created_at)}</div>
                </div>
                <span class="badge ${business.active ? "badge-success" : "badge-danger"}">${business.active ? "Ativa" : "Bloqueada"}</span>
              </div>

              <div class="support-business-grid">
                <div class="support-business-info">
                  <span class="support-business-label">Contato</span>
                  <strong>${business.owner_email || "Sem e-mail cadastrado"}</strong>
                </div>
                <div class="support-business-info">
                  <span class="support-business-label">WhatsApp</span>
                  <strong>${business.whatsapp || "Não informado"}</strong>
                </div>
                <div class="support-business-info">
                  <span class="support-business-label">Link público</span>
                  <strong>/${"?slug="}${business.slug}</strong>
                </div>
                <div class="support-business-info">
                  <span class="support-business-label">Cobrança</span>
                  <strong>${formatBillingLabel(business.billing_status)}</strong>
                </div>
                <div class="support-business-info support-business-info-wide">
                  <span class="support-business-label">Plano · valor mensal</span>
                  <strong>${planDisplayLabel(business)} · ${formatCurrency(getMonthlyPriceForBusiness(business))}</strong>
                </div>
                <div class="support-business-info support-business-info-wide">
                  <span class="support-business-label">Trial / vencimento</span>
                  <strong>${escapeHtml(formatSupportTrialSummary(business))}</strong>
                  <div class="text-xs text-sub" style="margin-top:4px;font-weight:500;">${escapeHtml(formatSupportDueLine(business))}</div>
                </div>
              </div>

              <div class="support-business-plan-row">
                <span class="chip">${normalizePlanName(business.plan_name)}</span>
                ${
                  business.support_notes
                    ? `<span class="support-note-preview">${escapeHtml(business.support_notes)}</span>`
                    : `<span class="support-note-preview empty">Sem notas de suporte</span>`
                }
              </div>

              <div class="card-actions" style="margin-top:14px;">
                <button class="btn btn-ghost btn-sm" type="button" onclick="openSupportPublicLink('${business.slug}')">Abrir link</button>
                <button class="btn btn-link btn-sm" type="button" onclick="openSupportBusinessModal('${business.id}')">Gerenciar</button>
                <button class="btn ${business.active ? "btn-warning" : "btn-success"} btn-sm" type="button" onclick="toggleBusinessBlocked('${business.id}')">${business.active ? "Bloquear" : "Desbloquear"}</button>
                <button class="btn btn-ghost btn-sm" type="button" onclick="sendSupportPasswordReset('${business.id}')">Reset senha</button>
              </div>
            </div>`
          )
          .join("")
      : emptyStateHtml("Nenhuma loja encontrada.");
  }

  const pageLabel = document.getElementById("supportPageLabel");
  const prevButton = document.getElementById("supportPrevPageButton") as HTMLButtonElement | null;
  const nextButton = document.getElementById("supportNextPageButton") as HTMLButtonElement | null;
  if (pageLabel) pageLabel.textContent = `Página ${state.supportPage} de ${totalPages}`;
  if (prevButton) prevButton.disabled = state.supportPage <= 1;
  if (nextButton) nextButton.disabled = state.supportPage >= totalPages;

  renderSupportRenewalList();
}

export function renderSupportRenewalList(): void {
  const container = document.getElementById("supportRenewalList");
  const pixEl = document.getElementById("supportPixKeyDisplay");
  const daysEl = document.getElementById("supportRenewalWindowDays");
  if (daysEl) daysEl.textContent = String(RENEWAL_REMINDER_WINDOW_DAYS);
  if (pixEl) {
    pixEl.textContent = AGENDAFACIL_PIX_KEY || "(defina VITE_AGENDAFACIL_PIX_KEY no deploy)";
  }
  if (!container) return;

  const upcoming = state.supportBusinesses
    .filter((b) => b.active && isInRenewalWindow(b))
    .map((b) => ({ b, due: getPaymentDueDate(b) }))
    .filter((row): row is { b: Business; due: Date } => row.due !== null && !Number.isNaN(row.due.getTime()))
    .sort((a, c) => a.due.getTime() - c.due.getTime());

  container.innerHTML = upcoming.length
    ? upcoming
        .map(
          ({ b, due }) => `
          <div class="support-renewal-card">
            <div class="support-renewal-top">
              <div>
                <div class="font-bold">${escapeHtml(b.name)}</div>
                <div class="text-sm text-sub">/?slug=${escapeHtml(b.slug)} · ${escapeHtml(b.whatsapp || "sem WhatsApp")}</div>
              </div>
              <span class="chip">${escapeHtml(planDisplayLabel(b))}</span>
            </div>
            <div class="support-renewal-meta">
              <div><span class="text-sub">Vencimento</span><strong>${due.toLocaleDateString("pt-BR")}</strong></div>
              <div><span class="text-sub">Valor</span><strong>${formatCurrency(getMonthlyPriceForBusiness(b))}</strong></div>
              <div><span class="text-sub">Cobrança</span><strong>${formatBillingLabel(b.billing_status)}</strong></div>
            </div>
            <div class="text-sm text-sub mb-2">${escapeHtml(formatSupportTrialSummary(b))}</div>
            <button class="btn btn-wa btn-sm" style="width:100%;" type="button" onclick="openRenewalReminderWhatsApp('${b.id}')">Enviar lembrete de renovação (WhatsApp)</button>
          </div>`
        )
        .join("")
    : `<div class="empty-state">Nenhuma loja ativa com vencimento nos próximos ${RENEWAL_REMINDER_WINDOW_DAYS} dias (e nenhum vencimento atrasado nessa janela). Ajuste as datas em “Gerenciar” ou amplie o prazo em VITE_RENEWAL_REMINDER_WINDOW_DAYS.</div>`;
}
