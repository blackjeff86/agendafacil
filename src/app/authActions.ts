import { getAppBaseUrl } from "../config/env";
import * as authService from "../services/authService";
import { isSupportAccountEmail } from "../ui/render/supportPanel";
import { switchAuthMode } from "./authUi";
import { state } from "../state/store";
import { applyBodyMode, showLoading, showScreen, showToast } from "../ui/dom";
import { getErrorMessage } from "../utils/errors";
import { slugify } from "../utils/strings";
import { loadAdminExperience } from "./bootstrap";
import { createBusinessAndSeed } from "./businessLifecycle";

export function openAppEntry(mode: "signup" | "login"): void {
  const base = getAppBaseUrl();
  const target = mode === "signup" ? `${base}/?app=signup` : `${base}/?app=login`;
  window.location.href = target;
}

export async function doLogin(): Promise<void> {
  const email = (document.getElementById("loginEmail") as HTMLInputElement).value.trim();
  const password = (document.getElementById("loginPass") as HTMLInputElement).value.trim();
  if (!email || !password) {
    showToast("Preencha e-mail e senha.");
    return;
  }

  showLoading(true);
  try {
    const { data, error } = await authService.signInWithPassword(email, password);
    if (error) throw error;
    state.session = data.session;
    state.user = data.user;
    await loadAdminExperience();
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error));
  } finally {
    showLoading(false);
  }
}

export async function doSignup(): Promise<void> {
  const isSupportSignup = isSupportAccountEmail((document.getElementById("signupEmail") as HTMLInputElement).value.trim());
  const draft = {
    name: (document.getElementById("signupBusinessName") as HTMLInputElement).value.trim(),
    slug: slugify((document.getElementById("signupSlug") as HTMLInputElement).value.trim()),
    category: (document.getElementById("signupCategory") as HTMLSelectElement).value,
    email: (document.getElementById("signupEmail") as HTMLInputElement).value.trim(),
    password: (document.getElementById("signupPass") as HTMLInputElement).value.trim(),
  };

  if ((!isSupportSignup && (!draft.name || !draft.slug)) || !draft.email || !draft.password) {
    showToast("Preencha todos os campos para criar a conta.");
    return;
  }

  showLoading(true);
  try {
    if (isSupportSignup) {
      localStorage.removeItem("agendafacil_pending_setup");
    } else {
      localStorage.setItem("agendafacil_pending_setup", JSON.stringify(draft));
    }
    const { data, error } = await authService.signUp(draft.email, draft.password, {
      data: isSupportSignup
        ? {}
        : {
            pending_business: {
              name: draft.name,
              slug: draft.slug,
              category: draft.category,
            },
          },
    });
    if (error) throw error;

    if (data.session?.user) {
      state.session = data.session;
      state.user = data.user;
      if (!isSupportSignup) {
        await createBusinessAndSeed(draft);
      }
      await loadAdminExperience();
      return;
    }

    showToast(
      isSupportSignup
        ? "Conta interna criada. Confirme seu e-mail e depois faça login no painel de suporte."
        : "Conta criada. Confirme seu e-mail no Supabase e depois faça login."
    );
    switchAuthMode("login");
    (document.getElementById("loginEmail") as HTMLInputElement).value = draft.email;
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error));
  } finally {
    showLoading(false);
  }
}

export async function completeInitialSetup(): Promise<void> {
  const draft = {
    name: (document.getElementById("setupBusinessName") as HTMLInputElement).value.trim(),
    slug: slugify((document.getElementById("setupSlug") as HTMLInputElement).value.trim()),
    category: (document.getElementById("setupCategory") as HTMLSelectElement).value,
    description: (document.getElementById("setupDescription") as HTMLTextAreaElement).value.trim(),
    whatsapp: (document.getElementById("setupWhatsapp") as HTMLInputElement).value.trim(),
  };

  if (!draft.name || !draft.slug) {
    showToast("Informe nome e slug do negocio.");
    return;
  }

  showLoading(true);
  try {
    await createBusinessAndSeed(draft);
    await loadAdminExperience();
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error));
  } finally {
    showLoading(false);
  }
}

export async function logout(): Promise<void> {
  showLoading(true);
  try {
    await authService.signOut();
    state.session = null;
    state.user = null;
    state.isPlatformAdmin = false;
    state.business = null;
    document.body.classList.remove("has-plan-strip");
    showScreen("loginPage");
    applyBodyMode("auth");
  } finally {
    showLoading(false);
  }
}
