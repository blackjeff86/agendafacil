import * as authService from "../services/authService";
import * as businessService from "../services/businessService";
import * as supportService from "../services/supportService";
import { state } from "../state/store";
import { isSupportAccountEmail, isSupportInternalBusiness, renderSupportBusinesses } from "../ui/render/supportPanel";
import { applyBodyMode, showLoading, showScreen, showToast } from "../ui/dom";
import { getErrorMessage } from "../utils/errors";
import { slugify } from "../utils/strings";
import { createBusinessAndSeed } from "./businessLifecycle";
import { refreshAllBusinessData } from "./refresh";
import { switchAuthMode } from "./authUi";
import { enterPublicHistoricoFromPortalToken, enterPublicHistoricoFromUrl } from "./clientHistoricoFlow";
import { loadPublicData } from "./publicData";
import { pubGoRaw } from "./publicFlow";
import { navTo } from "./navigation";
import { onlyDigits } from "../utils/phone";

function getPendingSetup(): Record<string, string> | null {
  try {
    const raw = localStorage.getItem("agendafacil_pending_setup");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getPendingSetupFromMetadata(): { name: string; slug: string; category: string } | null {
  if (isInternalSupportAccount()) {
    return null;
  }
  const pending = state.user?.user_metadata?.pending_business;
  if (!pending?.name || !pending?.slug) {
    return null;
  }
  return {
    name: pending.name,
    slug: slugify(String(pending.slug)),
    category: pending.category || "Salao de Beleza",
  };
}

function isInternalSupportAccount(): boolean {
  return state.isPlatformAdmin && isSupportAccountEmail(state.user?.email || "");
}

export async function ensureBusinessExists(): Promise<void> {
  if (isInternalSupportAccount()) {
    localStorage.removeItem("agendafacil_pending_setup");
    state.business = null;
    return;
  }

  const data = await businessService.fetchBusinessByOwner(state.user!.id);

  if (data) {
    state.business = data;
    localStorage.removeItem("agendafacil_pending_setup");
    return;
  }

  const pending = getPendingSetup() || getPendingSetupFromMetadata();
  if (pending) {
    await createBusinessAndSeed(pending as import("../types").PendingBusinessDraft);
    localStorage.removeItem("agendafacil_pending_setup");
    return;
  }

  state.business = null;
}

export async function loadSupportBusinesses(): Promise<void> {
  if (!state.isPlatformAdmin) {
    state.supportBusinesses = [];
    state.supportEvents = [];
    return;
  }
  const data = await supportService.fetchAllBusinesses();
  state.supportBusinesses = data.filter((business) => !isSupportInternalBusiness(business));
  const businessIds = state.supportBusinesses.map((business) => business.id);
  state.supportEvents = await supportService.fetchSupportEventsForBusinessIds(businessIds);
  renderSupportBusinesses();
}

export async function loadPlatformAdminStatus(): Promise<void> {
  if (!state.user) {
    state.isPlatformAdmin = false;
    return;
  }
  state.isPlatformAdmin = await authService.isPlatformAdmin();
}

export async function loadAdminExperience(): Promise<void> {
  await loadPlatformAdminStatus();
  await ensureBusinessExists();

  if (!state.business && !state.isPlatformAdmin) {
    const { showSetupPage } = await import("./setupFlow");
    showSetupPage();
    return;
  }

  if (state.business && !state.business.active && !state.isPlatformAdmin) {
    const el = document.getElementById("blockedReasonText");
    if (el) {
      el.textContent =
        state.business.blocked_reason || "Sua conta está temporariamente bloqueada. Fale com o suporte para regularizar.";
    }
    showScreen("blockedPage");
    return;
  }

  applyBodyMode(state.isPlatformAdmin ? "support" : "app");
  showScreen("adminShell");
  if (state.business) {
    await refreshAllBusinessData();
  }
  await loadSupportBusinesses();
  document.getElementById("supportNavItem")?.classList.toggle("hidden", !state.isPlatformAdmin);
  navTo(state.isPlatformAdmin ? "pageSupport" : "pageDashboard");
}

export async function bootstrapApp(): Promise<void> {
  showLoading(true);
  try {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug");
    const appMode = params.get("app");
    const { session, error } = await authService.getSession();
    if (error) throw error;

    state.session = session;
    state.user = session?.user ?? null;

    authService.onAuthStateChange(async (_event, nextSession) => {
      state.session = nextSession;
      state.user = nextSession?.user ?? null;
    });

    if (slug) {
      await loadPublicData(slug);
      showScreen("publicShell");
      const historico = params.get("historico") === "1";
      const cvRaw = params.get("cv") || params.get("portal");
      const telRaw = params.get("tel") || params.get("telefone");
      if (historico && cvRaw) {
        await enterPublicHistoricoFromPortalToken(slug, cvRaw);
      } else if (historico && telRaw) {
        const tel = onlyDigits(telRaw);
        if (tel.length >= 10) {
          await enterPublicHistoricoFromUrl(slug, tel);
        } else {
          pubGoRaw(0);
          showToast("Telefone inválido no link. Use o campo abaixo ou peça um novo link ao salão.");
        }
      } else if (historico) {
        pubGoRaw(0);
        showToast("Informe seu WhatsApp abaixo ou use o link enviado pelo salão (sem telefone na URL).");
      } else {
        pubGoRaw(0);
      }
      return;
    }

    if (session?.user) {
      await loadAdminExperience();
      return;
    }

    if (appMode) {
      showScreen("loginPage");
      if (appMode === "signup") {
        switchAuthMode("signup");
      }
    } else {
      showScreen("landingPage");
    }
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error));
    showScreen("landingPage");
  } finally {
    showLoading(false);
  }
}
