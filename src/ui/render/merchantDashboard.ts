import { DEFAULT_HOURS } from "../../constants/defaults";
import { findProfessional, findService } from "../../state/selectors";
import { state, STATUS_LABELS } from "../../state/store";
import type { Business } from "../../types";
import { emptyStateHtml } from "../components/emptyState";
import { getPublicAppUrl } from "../dom";
import { formatCurrency, formatDateShort, formatTimelineDate, formatTime } from "../../utils/formatters";
import { applyPlanNavVisibility, renderPlanStatusStrip, renderProfissionaisPlanHint } from "./planStrip";

export function applyBusinessPreview(business: Business | null): void {
  const avatar = document.getElementById("bizAvatarPreview");
  const cover = document.getElementById("bizCoverPreview");
  const logoImage = business?.logo_image_url || "";
  const coverImage = business?.cover_image_url || "";
  const emoji = business?.logo_emoji || "✂️";

  if (avatar) {
    avatar.style.backgroundImage = logoImage ? `url(${logoImage})` : "";
    avatar.style.backgroundSize = "cover";
    avatar.style.backgroundPosition = "center";
    avatar.style.color = logoImage ? "transparent" : "var(--brand)";
    avatar.textContent = logoImage ? "" : emoji;
  }

  if (cover) {
    cover.style.backgroundImage = coverImage
      ? `linear-gradient(rgba(30,27,75,.15), rgba(30,27,75,.15)), url(${coverImage})`
      : "";
    cover.style.backgroundSize = "cover";
    cover.style.backgroundPosition = "center";
  }
}

export function getTopServiceName(): string {
  const counts = new Map<string, number>();
  state.appointments.forEach((appointment) => {
    counts.set(appointment.service_id, (counts.get(appointment.service_id) || 0) + 1);
  });
  const top = [...counts.entries()].sort((left, right) => right[1] - left[1])[0];
  return top ? findService(top[0])?.name || "-" : "-";
}

export function getTopProfessionalName(): string {
  const counts = new Map<string, number>();
  state.appointments.forEach((appointment) => {
    if (appointment.professional_id) {
      counts.set(appointment.professional_id, (counts.get(appointment.professional_id) || 0) + 1);
    }
  });
  const top = [...counts.entries()].sort((left, right) => right[1] - left[1])[0];
  return top ? findProfessional(top[0])?.name || "-" : "-";
}

export function renderBusinessProfile(): void {
  const business = state.business;
  if (!business) return;

  const set = (id: string, value: string) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el) el.value = value;
  };

  const greeting = document.getElementById("greetingName");
  if (greeting) greeting.textContent = business.name;
  const avatarInitial = document.getElementById("avatarInitial");
  if (avatarInitial) avatarInitial.textContent = (business.name || "A").trim().charAt(0).toUpperCase();

  set("businessName", business.name || "");
  set("businessSlug", business.slug || "");
  set("businessCategory", business.category || "Barbearia");
  set("businessDescription", business.description || "");
  set("businessWhatsapp", business.whatsapp || "");
  set("businessInstagram", business.instagram || "");
  set("businessAddress", business.address || "");
  set("businessLogoEmoji", business.logo_emoji || "✂️");
  applyBusinessPreview(business);
}

export function renderDashboard(): void {
  const today = new Date().toISOString().slice(0, 10);
  const todayItems = state.appointments.filter((item) => item.appointment_date === today && item.status !== "cancelado");
  const revenue = todayItems.reduce((total, item) => total + (findService(item.service_id)?.price || 0), 0);

  const setText = (id: string, text: string) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setText("statTodayCount", String(todayItems.length));
  setText("statRevenue", formatCurrency(revenue));
  setText("statTopService", getTopServiceName());
  setText("statTopProfessional", getTopProfessionalName());

  const list = state.appointments.slice(0, 5);
  const dash = document.getElementById("dashApptList");
  if (!dash) return;
  dash.innerHTML = list.length
    ? list
        .map((appointment) => {
          const service = findService(appointment.service_id);
          const professional = findProfessional(appointment.professional_id);
          const status = STATUS_LABELS[appointment.status] || STATUS_LABELS.pendente;
          return `
            <div class="appt-item" onclick="openApptDetail('${appointment.id}')">
              <div class="appt-time">${formatTime(appointment.appointment_time)}</div>
              <div class="appt-info">
                <div class="name">${appointment.client_name}</div>
                <div class="detail">${service?.name || "Servico"} · ${professional?.name || "Sem preferencia"}</div>
              </div>
              <span class="badge ${status.cls}">${status.label}</span>
            </div>`;
        })
        .join("")
    : emptyStateHtml("Nenhum agendamento por enquanto.");
}

export function renderApptList(filter: string): void {
  let list = [...state.appointments];
  if (filter !== "todos") {
    list = list.filter((item) => item.status === filter);
  }

  const apptList = document.getElementById("apptList");
  if (!apptList) return;
  apptList.innerHTML = list.length
    ? list
        .map((appointment) => {
          const service = findService(appointment.service_id);
          const professional = findProfessional(appointment.professional_id);
          const status = STATUS_LABELS[appointment.status] || STATUS_LABELS.pendente;
          const dateStr = formatDateShort(appointment.appointment_date);
          const recurrenceBadge = appointment.series_id
            ? `<span class="chip" style="margin:0 0 0 8px;padding:2px 8px;font-size:10px;">Recorrente</span>`
            : "";
          return `
            <div class="appt-item" onclick="openApptDetail('${appointment.id}')">
              <div>
                <div class="appt-time">${formatTime(appointment.appointment_time)}</div>
                <div class="text-xs text-sub">${dateStr}</div>
              </div>
              <div class="appt-info">
                <div class="name">${appointment.client_name}${recurrenceBadge}</div>
                <div class="detail">${service?.name || "Servico"} · ${professional?.emoji || "👤"} ${professional?.name || "Sem preferencia"}</div>
              </div>
              <span class="badge ${status.cls}">${status.label}</span>
            </div>`;
        })
        .join("")
    : emptyStateHtml("Nenhum agendamento encontrado.");
}

export function renderCustomers(): void {
  const container = document.getElementById("clientesList");
  if (!container) return;
  container.innerHTML = state.customers.length
    ? state.customers
        .map((customer) => {
          const appointments = state.appointments.filter((item) => item.customer_id === customer.id);
          const recurrentCount = appointments.filter((item) => item.series_id).length;
          return `
            <div class="card">
              <div class="flex justify-between items-start gap-3">
                <div>
                  <div class="font-bold text-lg">${customer.name}</div>
                  <div class="text-sm text-sub">${customer.email || "Sem e-mail"} · ${customer.phone}</div>
                </div>
                <span class="badge badge-brand">${appointments.length} agendamento(s)</span>
              </div>
              <div class="text-sm text-sub mt-2">Último contato: ${customer.last_booking_at ? formatTimelineDate(customer.last_booking_at) : "Ainda sem agendamento"}</div>
              <div class="flex gap-2 mt-2" style="flex-wrap:wrap;">
                <span class="chip">WhatsApp: ${customer.phone}</span>
                ${customer.email ? `<span class="chip">E-mail: ${customer.email}</span>` : ""}
                ${recurrentCount ? `<span class="chip">Recorrentes: ${recurrentCount}</span>` : ""}
              </div>
            </div>`;
        })
        .join("")
    : emptyStateHtml("Os clientes aparecerão aqui conforme fizerem agendamentos pelo link público.");
}

export function renderServicos(): void {
  const el = document.getElementById("servicosList");
  if (!el) return;
  el.innerHTML = state.services.length
    ? state.services
        .map(
          (service) => `
            <div class="card card-sm flex items-center gap-3 ${service.active ? "" : "soft-inactive"}" style="margin-bottom:10px;">
              <div class="service-icon">${service.icon || "✂️"}</div>
              <div style="flex:1;">
                <div class="flex justify-between items-center gap-2">
                  <div class="font-semibold">${service.name}</div>
                  <div class="flex items-center gap-2">
                    <span class="badge ${service.active ? "badge-success" : "badge-danger"}">${service.active ? "Ativo" : "Inativo"}</span>
                    <div class="card-menu" id="service-menu-${service.id}">
                      <button class="card-menu-btn" type="button" onclick="toggleCardMenu('service-menu-${service.id}')">⋯</button>
                      <div class="card-menu-sheet">
                        <button class="card-menu-item" type="button" onclick="editService('${service.id}')">Editar</button>
                        <button class="card-menu-item warning" type="button" onclick="toggleServiceActive('${service.id}')">${service.active ? "Desativar" : "Reativar"}</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="text-sm text-sub mt-1">${service.description || ""}</div>
                <div class="flex gap-3 mt-1">
                  <span class="text-sm font-bold text-brand">${formatCurrency(service.price)}</span>
                  <span class="text-sm text-sub">⏱ ${service.duration} min</span>
                  <span class="chip" style="margin:0;padding:2px 8px;font-size:10px;">${service.category || "Servico"}</span>
                </div>
              </div>
            </div>`
        )
        .join("")
    : emptyStateHtml("Cadastre seu primeiro servico.");
}

export function renderProfissionais(): void {
  const el = document.getElementById("profissionaisList");
  if (!el) return;
  el.innerHTML = state.professionals.length
    ? state.professionals
        .map((professional) => {
          const serviceNames = state.professionalServices
            .filter((item) => item.professional_id === professional.id)
            .map((item) => findService(item.service_id)?.name)
            .filter(Boolean);

          return `
            <div class="card card-sm flex items-center gap-3 ${professional.active ? "" : "soft-inactive"}" style="margin-bottom:10px;">
              <div class="avatar avatar-lg">${professional.emoji || "👤"}</div>
              <div style="flex:1;">
                <div class="flex justify-between items-center gap-2">
                  <div class="font-bold">${professional.name}</div>
                  <div class="flex items-center gap-2">
                    <span class="badge ${professional.active ? "badge-success" : "badge-danger"}">${professional.active ? "Ativo" : "Inativo"}</span>
                    <div class="card-menu" id="professional-menu-${professional.id}">
                      <button class="card-menu-btn" type="button" onclick="toggleCardMenu('professional-menu-${professional.id}')">⋯</button>
                      <div class="card-menu-sheet">
                        <button class="card-menu-item" type="button" onclick="editProfessional('${professional.id}')">Editar</button>
                        <button class="card-menu-item warning" type="button" onclick="toggleProfessionalActive('${professional.id}')">${professional.active ? "Desativar" : "Reativar"}</button>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="text-sm text-sub">${professional.role || ""}</div>
                <div class="mt-1">${serviceNames.map((name) => `<span class="chip" style="margin-bottom:0;">${name}</span>`).join("")}</div>
              </div>
            </div>`;
        })
        .join("")
    : emptyStateHtml("Cadastre seu primeiro profissional.");
}

export function renderHorarios(): void {
  const list = state.hours.length ? state.hours : DEFAULT_HOURS;
  const el = document.getElementById("horariosList");
  if (!el) return;
  el.innerHTML = list
    .map(
      (hour) => `
        <div class="flex items-center justify-between" style="padding:10px 0;border-bottom:1px solid var(--border);">
          <div class="font-semibold text-sm" style="min-width:80px;">${hour.day_name}</div>
          <div class="flex gap-2" style="align-items:center;">
            <input type="time" id="hour-open-${hour.day_of_week}" value="${hour.open_time || ""}" ${hour.active ? "" : "disabled"} style="width:110px;" />
            <span class="text-sm text-sub">ate</span>
            <input type="time" id="hour-close-${hour.day_of_week}" value="${hour.close_time || ""}" ${hour.active ? "" : "disabled"} style="width:110px;" />
          </div>
          <label class="toggle">
            <input type="checkbox" id="hour-active-${hour.day_of_week}" ${hour.active ? "checked" : ""} onchange="toggleHourInputs(${hour.day_of_week})" />
            <span class="toggle-slider"></span>
          </label>
        </div>`
    )
    .join("");
}

export function populateModalOptions(): void {
  const serviceOptions = state.services.map((service) => `<option value="${service.id}">${service.name}</option>`).join("");
  const professionalOptions = [`<option value="">Sem preferencia</option>`]
    .concat(state.professionals.map((professional) => `<option value="${professional.id}">${professional.name}</option>`))
    .join("");

  const newApptService = document.getElementById("newApptService");
  const newApptProfessional = document.getElementById("newApptProfessional");
  const newProfServices = document.getElementById("newProfServices");
  if (newApptService) newApptService.innerHTML = serviceOptions;
  if (newApptProfessional) newApptProfessional.innerHTML = professionalOptions;
  if (newProfServices) newProfServices.innerHTML = serviceOptions;
}

export function updatePublicLink(): void {
  if (!state.business) return;
  const publicUrl = getPublicAppUrl(state.business.slug);
  const bizLink = document.getElementById("bizLink");
  if (bizLink) bizLink.textContent = publicUrl;
}

export function toggleCardMenu(menuId: string): void {
  const menu = document.getElementById(menuId);
  if (!menu) return;
  const isOpen = menu.classList.contains("open");
  document.querySelectorAll(".card-menu").forEach((item) => item.classList.remove("open"));
  if (!isOpen) menu.classList.add("open");
}

export function renderAdmin(): void {
  renderPlanStatusStrip();
  applyPlanNavVisibility();
  renderBusinessProfile();
  renderDashboard();
  renderApptList(state.currentFilter);
  renderServicos();
  renderProfissionais();
  renderProfissionaisPlanHint();
  renderHorarios();
  renderCustomers();
  populateModalOptions();
  updatePublicLink();
}
