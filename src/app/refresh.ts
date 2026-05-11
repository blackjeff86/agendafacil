import { loadWorkspaceForBusiness } from "../services/workspaceService";
import { state } from "../state/store";
import { renderAdmin } from "../ui/render/merchantDashboard";

export async function refreshAllBusinessData(): Promise<void> {
  if (!state.business) return;
  const bundle = await loadWorkspaceForBusiness(state.business.id, { business: state.business });
  state.services = bundle.services;
  state.professionals = bundle.professionals;
  state.customers = bundle.customers;
  state.appointmentSeries = bundle.appointmentSeries;
  state.appointments = bundle.appointments;
  state.hours = bundle.hours;
  state.professionalServices = bundle.professionalServices;
  renderAdmin();
}
