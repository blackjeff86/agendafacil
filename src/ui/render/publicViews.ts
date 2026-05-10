import { bookingState, state } from "../../state/store";
import { emptyStateHtml } from "../components/emptyState";
import { formatCurrency, formatHoursSummary, formatLongDate } from "../../utils/formatters";

export function renderPublicLanding(): void {
  const { business, services, professionals, hours } = state.publicData;
  if (!business) return;

  const hero = document.getElementById("publicHeroEmoji");
  if (hero) {
    if (business.logo_image_url) {
      hero.innerHTML = `<img src="${business.logo_image_url}" alt="Logo do negocio" style="width:100%;height:100%;object-fit:cover;border-radius:20px;" />`;
    } else {
      hero.textContent = business.logo_emoji || "✂️";
    }
  }
  const setText = (id: string, t: string) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t;
  };
  setText("publicHeroName", business.name);
  setText("publicHeroDescription", business.description || "Agende seu horario online.");
  setText("publicHeroAddress", `📍 ${business.address || "Endereco nao informado"}`);
  setText("publicHeroWhatsapp", `💬 ${business.whatsapp || "WhatsApp"}`);
  setText("publicHeroHours", `🕐 ${formatHoursSummary(hours)}`);
  setText("publicAddressCard", business.address || "Endereco nao informado");
  setText("publicInstagramCard", business.instagram || "@sem-instagram");

  const pubHero = document.querySelector(".pub-hero") as HTMLElement | null;
  if (pubHero) {
    if (business.cover_image_url) {
      pubHero.style.backgroundImage = `linear-gradient(160deg, rgba(124,58,237,.8) 0%, rgba(91,33,182,.8) 100%), url(${business.cover_image_url})`;
      pubHero.style.backgroundSize = "cover";
      pubHero.style.backgroundPosition = "center";
    } else {
      pubHero.style.backgroundImage = "";
    }
  }

  const pubServicePreview = document.getElementById("pubServicePreview");
  if (pubServicePreview) {
    pubServicePreview.innerHTML = services.length
      ? services
          .map(
            (service) => `
            <div class="service-card" style="cursor:default;">
              <div class="service-icon">${service.icon || "✂️"}</div>
              <div style="flex:1;">
                <div class="font-semibold">${service.name}</div>
                <div class="text-xs text-sub mt-1">${service.description || ""}</div>
                <div class="flex gap-3 mt-1">
                  <span class="text-sm font-bold text-brand">${formatCurrency(service.price)}</span>
                  <span class="text-xs text-sub">⏱ ${service.duration}min</span>
                </div>
              </div>
            </div>`
          )
          .join("")
      : emptyStateHtml("Nenhum servico publico ativo.");
  }

  const pubProfPreview = document.getElementById("pubProfPreview");
  if (pubProfPreview) {
    pubProfPreview.innerHTML = professionals.length
      ? professionals
          .map(
            (professional) => `
            <div class="prof-card" style="cursor:default;">
              <div class="avatar">${professional.emoji || "👤"}</div>
              <div>
                <div class="font-bold">${professional.name}</div>
                <div class="text-sm text-sub">${professional.role || ""}</div>
              </div>
            </div>`
          )
          .join("")
      : emptyStateHtml("Nenhum profissional disponivel.");
  }
}

export function renderPubServices(filteredProfessionalId: string | null = null): void {
  const services = filteredProfessionalId
    ? state.publicData.services.filter((service) => {
        const professional = state.publicData.professionals.find((item) => item.id === filteredProfessionalId);
        return professional?.serviceIds?.includes(service.id);
      })
    : state.publicData.services;

  const el = document.getElementById("pubServiceList");
  if (!el) return;
  el.innerHTML = services
    .map(
      (service) => `
        <div class="service-card" id="svc-${service.id}" onclick="selectService('${service.id}')">
          <div class="service-icon">${service.icon || "✂️"}</div>
          <div style="flex:1;">
            <div class="font-semibold">${service.name}</div>
            <div class="text-xs text-sub mt-1">${service.description || ""}</div>
            <div class="flex gap-3 mt-1">
              <span class="text-sm font-bold text-brand">${formatCurrency(service.price)}</span>
              <span class="text-xs text-sub">⏱ ${service.duration}min</span>
            </div>
          </div>
        </div>`
    )
    .join("");
}

export function renderPubProfs(serviceId: string | null = null): void {
  const professionals = serviceId
    ? state.publicData.professionals.filter((professional) => professional.serviceIds?.includes(serviceId))
    : state.publicData.professionals;

  const firstOption = `
    <div class="prof-card" id="prof-0" onclick="selectProf('0')">
      <div class="avatar">👤</div>
      <div style="flex:1;">
        <div class="font-bold">Sem preferencia</div>
        <div class="text-sm text-sub">Primeiro profissional disponivel</div>
      </div>
    </div>`;

  const el = document.getElementById("pubProfList");
  if (!el) return;
  el.innerHTML =
    firstOption +
    professionals
      .map(
        (professional) => `
          <div class="prof-card" id="prof-${professional.id}" onclick="selectProf('${professional.id}')">
            <div class="avatar">${professional.emoji || "👤"}</div>
            <div style="flex:1;">
              <div class="font-bold">${professional.name}</div>
              <div class="text-sm text-sub">${professional.role || ""}</div>
            </div>
          </div>`
      )
      .join("");
}

export function renderDateScroll(): void {
  const list: string[] = [];
  const base = new Date();
  const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  for (let index = 0; index < 14; index += 1) {
    const date = new Date(base);
    date.setDate(base.getDate() + index);
    const iso = date.toISOString().slice(0, 10);
    list.push(`
      <button class="date-btn ${index === 0 ? "today" : ""}" type="button" onclick="selectDate('${iso}')">
        <span style="font-size:10px;">${labels[date.getDay()]}</span>
        <span class="day-num">${date.getDate()}</span>
      </button>
    `);
  }
  const el = document.getElementById("dateScroll");
  if (el) el.innerHTML = list.join("");
}

export function fillSummary(): void {
  const service = state.publicData.services.find((item) => item.id === bookingState.serviceId);
  const professional =
    bookingState.profId && bookingState.profId !== 0
      ? state.publicData.professionals.find((item) => item.id === bookingState.profId)
      : undefined;
  const set = (id: string, v: string) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  };
  set("sumService", service?.name || "—");
  set("sumProf", professional ? `${professional.emoji || "👤"} ${professional.name}` : "Primeiro disponivel");
  set("sumDate", bookingState.date ? formatLongDate(bookingState.date) : "—");
  set("sumTime", bookingState.time || "—");
  set("sumDuration", service ? `${service.duration} minutos` : "—");
  set("sumPrice", service ? formatCurrency(service.price) : "—");
}
