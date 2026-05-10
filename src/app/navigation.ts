import { canAccessCustomersModule, canAccessReportsModule } from "../config/plans";
import { renderApptList } from "../ui/render/merchantDashboard";
import { renderReportsPage } from "../ui/render/planStrip";
import { state } from "../state/store";
import { showToast } from "../ui/dom";

export function navTo(pageId: string): void {
  if (state.business && !state.isPlatformAdmin) {
    if (pageId === "pageClientes" && !canAccessCustomersModule(state.business)) {
      showToast("Gestão de clientes faz parte do Plano Pro.");
      return;
    }
    if (pageId === "pageRelatorios" && !canAccessReportsModule(state.business)) {
      showToast("Relatórios fazem parte do Plano Pro.");
      return;
    }
  }

  document.querySelectorAll("#adminShell .page").forEach((page) => page.classList.remove("active"));
  document.getElementById(pageId)?.classList.add("active");
  document.querySelectorAll(".nav-item").forEach((button) => {
    const el = button as HTMLElement;
    el.classList.toggle("active", el.dataset.page === pageId);
  });

  if (pageId === "pageRelatorios") renderReportsPage();
}

export function filterAppt(filter: string, event?: Event): void {
  state.currentFilter = filter;
  document.querySelectorAll(".appt-filter-btn").forEach((button) => {
    const el = button as HTMLElement;
    el.classList.toggle("btn-brand", el.dataset.filter === filter);
    el.classList.toggle("btn-ghost", el.dataset.filter !== filter);
  });
  if (event?.target instanceof HTMLElement) {
    event.target.blur();
  }
  renderApptList(filter);
}
