import * as businessService from "../services/businessService";
import { state } from "../state/store";
import { closeModal, openModal, showLoading, showToast } from "../ui/dom";
import { getErrorMessage } from "../utils/errors";
import { refreshAllBusinessData } from "./refresh";

export function openPlanUpgradeModal(): void {
  openModal("modalPlanUpgrade");
}

export async function confirmPlanUpgradeToPro(): Promise<void> {
  if (!state.business) return;
  showLoading(true);
  try {
    await businessService.updateBusiness(state.business.id, {
      plan_tier: "pro",
      plan_name: "Plano Pro",
      billing_status: "active",
    });
    state.business = {
      ...state.business,
      plan_tier: "pro",
      plan_name: "Plano Pro",
      billing_status: "active",
    };
    closeModal("modalPlanUpgrade");
    showToast("Plano atualizado para Pro.");
    await refreshAllBusinessData();
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error));
  } finally {
    showLoading(false);
  }
}
