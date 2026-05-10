import * as businessService from "../services/businessService";
import { state } from "../state/store";
import type { PendingBusinessDraft } from "../types";

export async function createBusinessAndSeed(draft: PendingBusinessDraft): Promise<void> {
  const payload = businessService.buildNewBusinessPayload(state.user!.id, state.user?.email, draft);
  const business = await businessService.insertBusiness(payload);
  state.business = business;
  await businessService.seedBusinessDefaults(business.id);
}
