import * as appointmentService from "../services/appointmentService";
import { state } from "../state/store";
import type { PublicClientAppointmentSnapshot } from "../types";
import { generateTimeSlotsForDate } from "../utils/dates";
import { getFriendlyAppointmentError } from "../utils/errors";
import { formatLongDate, formatTime } from "../utils/formatters";
import { onlyDigits } from "../utils/phone";
import { closeModal, openModal, showLoading, showToast } from "../ui/dom";
import { hideHistoricoShell, pubGoRaw, showHistoricoShell } from "./publicFlow";

export interface HistoricoRpcPayload {
  ok: boolean;
  error?: string;
  business_name?: string;
  slug?: string;
  appointments?: PublicClientAppointmentSnapshot[];
  stats?: {
    total_visitas: number;
    total_reservados: number;
    top_services: { service_id: string; service_name: string; cnt: number }[];
  };
}

let historicoPhoneDigits = "";
/** Quando o cliente abre pelo link com `cv=` (token opaco). */
let historicoAuthPortalToken: string | null = null;
let historicoSnapshot: HistoricoRpcPayload | null = null;
let historicoRescheduleTarget: PublicClientAppointmentSnapshot | null = null;

export async function enterPublicHistoricoFromPortalToken(slug: string, portalTokenRaw: string): Promise<void> {
  const token = String(portalTokenRaw || "").trim();
  historicoAuthPortalToken = token || null;
  historicoPhoneDigits = "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
    showToast("Link inválido.");
    hideHistoricoShell();
    pubGoRaw(0);
    return;
  }

  showLoading(true);
  try {
    const { data, error } = await appointmentService.getPublicClientSnapshotByToken({
      slug,
      portalToken: token,
    });
    if (error) throw error;
    historicoSnapshot = data as HistoricoRpcPayload;
    if (!historicoSnapshot.ok) {
      showToast(historicoSnapshot.error || "Não foi possível carregar seu histórico.");
      hideHistoricoShell();
      pubGoRaw(0);
      return;
    }
    renderHistoricoBody();
    showHistoricoShell();
  } catch (err) {
    console.error(err);
    showToast(getFriendlyAppointmentError(err));
    hideHistoricoShell();
    pubGoRaw(0);
  } finally {
    showLoading(false);
  }
}

export async function enterPublicHistoricoFromUrl(slug: string, phoneDigitsRaw: string): Promise<void> {
  historicoAuthPortalToken = null;
  historicoPhoneDigits = onlyDigits(phoneDigitsRaw);
  if (historicoPhoneDigits.length < 10) {
    showToast("Telefone inválido. Use DDD + número no link.");
    hideHistoricoShell();
    pubGoRaw(0);
    return;
  }

  showLoading(true);
  try {
    const { data, error } = await appointmentService.getPublicClientSnapshot({
      slug,
      phoneDigits: historicoPhoneDigits,
    });
    if (error) throw error;
    historicoSnapshot = data as HistoricoRpcPayload;
    if (!historicoSnapshot.ok) {
      showToast(historicoSnapshot.error || "Não foi possível carregar seu histórico.");
      hideHistoricoShell();
      pubGoRaw(0);
      return;
    }
    renderHistoricoBody();
    showHistoricoShell();
  } catch (err) {
    console.error(err);
    showToast(getFriendlyAppointmentError(err));
    hideHistoricoShell();
    pubGoRaw(0);
  } finally {
    showLoading(false);
  }
}

export async function submitHistoricoPhoneFromPubHome(): Promise<void> {
  historicoAuthPortalToken = null;
  const input = document.getElementById("pubHistoricoPhoneInput") as HTMLInputElement | null;
  const slug = state.publicData.business?.slug || new URLSearchParams(window.location.search).get("slug");
  if (!slug) {
    showToast("Link inválido.");
    return;
  }
  const digits = onlyDigits(input?.value || "");
  if (digits.length < 10) {
    showToast("Informe seu WhatsApp com DDD.");
    return;
  }
  await enterPublicHistoricoFromUrl(slug, digits);
}

function renderHistoricoBody(): void {
  const root = document.getElementById("pubHistoricoBody");
  if (!root || !historicoSnapshot?.ok || !historicoSnapshot.stats) return;

  const appts = Array.isArray(historicoSnapshot.appointments) ? historicoSnapshot.appointments : [];
  const stats = historicoSnapshot.stats;
  const top = stats.top_services || [];

  const reserved = appts.filter((a) => bucketAppointment(a) === "reservado");
  const past = appts.filter((a) => bucketAppointment(a) === "passado");
  const cancelled = appts.filter((a) => bucketAppointment(a) === "cancelado");

  const topHtml =
    top.length === 0
      ? `<p class="text-sm text-sub">Ainda não há histórico de serviços para exibir.</p>`
      : `<ul class="historico-top-list">${top.map((t) => `<li><span>${escapeHtml(t.service_name)}</span><strong>${t.cnt}×</strong></li>`).join("")}</ul>`;

  root.innerHTML = `
    <div class="pub-hero historico-hero">
      <div class="biz-logo" id="pubHistoricoEmoji">📋</div>
      <h1 style="font-size:22px;font-weight:800;">Seus horários</h1>
      <p class="text-sm text-sub" style="margin-bottom:12px;">${escapeHtml(historicoSnapshot.business_name || "")}</p>
      <div class="historico-stats-row">
        <div class="historico-stat"><span>Visitas agendadas</span><strong>${stats.total_visitas}</strong></div>
        <div class="historico-stat"><span>Reservas ativas</span><strong>${stats.total_reservados}</strong></div>
      </div>
    </div>
    <div class="p-4">
      <div class="section-title">Serviços mais frequentes com este salão</div>
      ${topHtml}

      <div class="section-title mt-4">Reservados</div>
      ${reserved.length ? reserved.map(renderApptCard).join("") : `<p class="text-sm text-sub">Nenhum horário futuro pendente.</p>`}

      <div class="section-title mt-4">Realizados / anteriores</div>
      ${past.length ? past.map(renderApptCard).join("") : `<p class="text-sm text-sub">Nenhum registro anterior.</p>`}

      ${
        cancelled.length
          ? `<div class="section-title mt-4">Cancelados</div>${cancelled.map(renderApptCard).join("")}`
          : ""
      }

      <button type="button" class="btn btn-outline mt-4" style="width:100%" onclick="leaveHistoricoToBooking()">Novo agendamento</button>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bucketAppointment(appt: PublicClientAppointmentSnapshot): "reservado" | "passado" | "cancelado" {
  if (appt.status === "cancelado") return "cancelado";
  const today = new Date().toISOString().slice(0, 10);
  if (appt.appointment_date < today) return "passado";
  if (appt.status === "concluido") return "passado";
  return "reservado";
}

function canClientReschedule(appt: PublicClientAppointmentSnapshot): boolean {
  if (appt.status === "cancelado" || appt.status === "concluido") return false;
  const today = new Date().toISOString().slice(0, 10);
  if (appt.appointment_date < today) return false;
  return true;
}

function renderApptCard(appt: PublicClientAppointmentSnapshot): string {
  const stLabel =
    appt.status === "confirmado"
      ? `<span class="badge badge-success">Confirmado</span>`
      : appt.status === "pendente"
        ? `<span class="badge badge-warning">Pendente</span>`
        : appt.status === "cancelado"
          ? `<span class="badge badge-danger">Cancelado</span>`
          : `<span class="badge badge-brand">${appt.status}</span>`;

  const rescheduleBtn = canClientReschedule(appt)
    ? `<button type="button" class="btn btn-link btn-sm" style="padding:0;margin-top:8px;" onclick="openPublicRescheduleModal('${appt.id}')">Reagendar</button>`
    : "";

  return `
    <div class="card historico-appt-card" style="margin-bottom:12px;">
      <div class="flex justify-between items-start gap-2">
        <div>
          <div class="font-semibold">${escapeHtml(appt.service_name || "Serviço")}</div>
          <div class="text-sm text-sub">${escapeHtml(appt.professional_name || "Profissional")}</div>
        </div>
        ${stLabel}
      </div>
      <div class="text-sm mt-2">📅 ${formatLongDate(appt.appointment_date)} · 🕐 ${formatTime(appt.appointment_time)}</div>
      ${rescheduleBtn}
    </div>
  `;
}

export function leaveHistoricoToBooking(): void {
  hideHistoricoShell();
  pubGoRaw(0);
}

export async function openPublicRescheduleModal(appointmentId: string): Promise<void> {
  const appts = historicoSnapshot?.appointments || [];
  const appt = appts.find((a) => a.id === appointmentId);
  if (!appt || !canClientReschedule(appt)) {
    showToast("Este horário não pode ser reagendado aqui.");
    return;
  }
  historicoRescheduleTarget = appt;

  const svcEl = document.getElementById("histRescheduleService");
  const dateEl = document.getElementById("histRescheduleDate") as HTMLInputElement | null;
  const profEl = document.getElementById("histRescheduleProf") as HTMLSelectElement | null;
  const timeEl = document.getElementById("histRescheduleTime") as HTMLInputElement | null;

  if (svcEl) svcEl.textContent = appt.service_name || "Serviço";
  if (dateEl) {
    dateEl.value = appt.appointment_date;
    dateEl.min = new Date().toISOString().slice(0, 10);
  }
  if (timeEl) timeEl.value = formatTime(appt.appointment_time);

  if (profEl) {
    const pros = state.publicData.professionals.filter(
      (p) => (p.serviceIds || []).includes(appt.service_id)
    );
    profEl.innerHTML = [`<option value="">Sem preferência</option>`]
      .concat(pros.map((p) => `<option value="${p.id}" ${p.id === appt.professional_id ? "selected" : ""}>${p.name}</option>`))
      .join("");
  }

  openModal("modalPubReschedule");
  await renderHistoricoRescheduleTimeGrid();
}

export function closePublicRescheduleModal(): void {
  historicoRescheduleTarget = null;
  closeModal("modalPubReschedule");
}

export async function renderHistoricoRescheduleTimeGrid(): Promise<void> {
  const container = document.getElementById("histRescheduleTimeGrid");
  if (!container || !historicoRescheduleTarget || !state.publicData.business) return;

  const dateVal = (document.getElementById("histRescheduleDate") as HTMLInputElement)?.value;
  const profVal = (document.getElementById("histRescheduleProf") as HTMLSelectElement)?.value;
  const professionalId = profVal === "" ? null : profVal;

  if (!dateVal) {
    container.innerHTML = `<div class="text-sm text-sub">Escolha a data.</div>`;
    return;
  }

  const slots = generateTimeSlotsForDate(dateVal, state.publicData.hours);
  if (!slots.length) {
    container.innerHTML = `<div class="text-sm text-sub">Salão fechado neste dia.</div>`;
    return;
  }

  container.innerHTML = `<div class="text-sm text-sub">Carregando…</div>`;

  const availability = await Promise.all(
    slots.map(async (slot) => ({
      slot,
      available: await appointmentService.isSlotAvailable({
        businessId: state.publicData.business!.id,
        serviceId: historicoRescheduleTarget!.service_id,
        professionalId,
        date: dateVal,
        time: slot,
        excludeAppointmentId: historicoRescheduleTarget!.id,
      }),
    }))
  );

  const timeEl = document.getElementById("histRescheduleTime") as HTMLInputElement | null;
  const selectedNorm = timeEl?.value ? formatTime(timeEl.value) : "";

  container.innerHTML = availability
    .map(({ slot, available }) => {
      const isSel = Boolean(available && selectedNorm === slot);
      const cls = isSel ? "time-btn selected" : "time-btn";
      return `<button type="button" class="${cls}" ${available ? "" : "disabled"} onclick="histSelectRescheduleSlot('${slot}')">${slot}</button>`;
    })
    .join("");
}

export function histSelectRescheduleSlot(slot: string): void {
  const timeEl = document.getElementById("histRescheduleTime") as HTMLInputElement | null;
  if (timeEl) timeEl.value = slot;
  void renderHistoricoRescheduleTimeGrid();
}

export async function confirmPublicReschedule(): Promise<void> {
  if (!historicoRescheduleTarget || !state.publicData.business) return;

  const dateVal = (document.getElementById("histRescheduleDate") as HTMLInputElement).value;
  const profVal = (document.getElementById("histRescheduleProf") as HTMLSelectElement).value;
  const timeEl = document.getElementById("histRescheduleTime") as HTMLInputElement;
  const timeRaw = formatTime(timeEl.value);

  if (!dateVal || !timeRaw) {
    showToast("Escolha data e horário.");
    return;
  }

  const professionalId = profVal === "" ? null : profVal;

  const okSlot = await appointmentService.isSlotAvailable({
    businessId: state.publicData.business.id,
    serviceId: historicoRescheduleTarget.service_id,
    professionalId,
    date: dateVal,
    time: timeRaw,
    excludeAppointmentId: historicoRescheduleTarget.id,
  });

  if (!okSlot) {
    showToast("Horário indisponível. Escolha outro.");
    return;
  }

  showLoading(true);
  try {
    const timeSql = timeRaw.length <= 5 ? `${timeRaw}:00` : timeRaw;
    const byToken = Boolean(historicoAuthPortalToken);
    const { data, error } = byToken
      ? await appointmentService.reschedulePublicAppointmentByToken({
          appointmentId: historicoRescheduleTarget.id,
          portalToken: historicoAuthPortalToken!,
          date: dateVal,
          time: timeSql,
          professionalId,
        })
      : await appointmentService.reschedulePublicAppointment({
          appointmentId: historicoRescheduleTarget.id,
          phoneDigits: historicoPhoneDigits,
          date: dateVal,
          time: timeSql,
          professionalId,
        });
    if (error) throw error;
    const res = data as { ok?: boolean; error?: string; portal_token?: string | null };
    if (!res?.ok) {
      showToast(res?.error || "Não foi possível reagendar.");
      return;
    }
    if (byToken && res.portal_token) {
      historicoAuthPortalToken = res.portal_token;
    }
    closePublicRescheduleModal();
    showToast("Horário atualizado com sucesso!");
    const slug = state.publicData.business.slug;
    if (historicoAuthPortalToken) {
      await enterPublicHistoricoFromPortalToken(slug, historicoAuthPortalToken);
    } else {
      await enterPublicHistoricoFromUrl(slug, historicoPhoneDigits);
    }
  } catch (err) {
    console.error(err);
    showToast(getFriendlyAppointmentError(err));
  } finally {
    showLoading(false);
  }
}
