import { getAppBaseUrl } from "../config/env";
import * as authService from "../services/authService";
import { isSupportAccountEmail } from "../ui/render/supportPanel";
import { normalizeSignupPlan, syncEntryViewFromUrl, switchAuthMode } from "./authUi";
import { state } from "../state/store";
import { applyBodyMode, closeModal, openModal, showLoading, showScreen, showToast } from "../ui/dom";
import { getErrorMessage } from "../utils/errors";
import { slugify } from "../utils/strings";
import { loadAdminExperience } from "./bootstrap";
import { createBusinessAndSeed } from "./businessLifecycle";

function planNameFromTier(planTier: "starter" | "pro"): "Plano Starter" | "Plano Pro" {
  return planTier === "pro" ? "Plano Pro" : "Plano Starter";
}

function clearRecoveryUrl(): void {
  const url = new URL(window.location.href || getAppBaseUrl());
  url.searchParams.delete("recovery");
  url.hash = "";
  window.history.replaceState(window.history.state || {}, "", url);
}

export function isPasswordRecoveryMode(): boolean {
  const url = new URL(window.location.href || getAppBaseUrl());
  return url.searchParams.get("recovery") === "1" || url.hash.includes("type=recovery");
}

export function openPasswordRecoveryModal(): void {
  switchAuthMode("login");
  showScreen("loginPage");
  openModal("modalPasswordRecovery");
}

export function closePasswordRecoveryModal(): void {
  const nextPassword = document.getElementById("passwordRecoveryNew") as HTMLInputElement | null;
  const confirmPassword = document.getElementById("passwordRecoveryConfirm") as HTMLInputElement | null;
  if (nextPassword) nextPassword.value = "";
  if (confirmPassword) confirmPassword.value = "";
  clearRecoveryUrl();
  closeModal("modalPasswordRecovery");
}

export function openAppEntry(mode: "signup" | "login", plan?: "starter" | "pro"): void {
  const url = new URL(window.location.href || getAppBaseUrl());
  url.searchParams.delete("slug");
  url.searchParams.set("app", mode);
  if (mode === "signup") {
    const chosenPlan = normalizeSignupPlan(plan);
    url.searchParams.set("plan", chosenPlan);
  } else {
    url.searchParams.delete("plan");
  }
  window.history.pushState({ app: mode }, "", url);
  syncEntryViewFromUrl();
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

export async function requestPasswordReset(): Promise<void> {
  const email = (document.getElementById("loginEmail") as HTMLInputElement | null)?.value.trim() || "";
  if (!email) {
    showToast("Digite seu e-mail para receber o link de recuperação.");
    return;
  }

  showLoading(true);
  try {
    const redirectTo = `${getAppBaseUrl()}/?app=login&recovery=1`;
    const { error } = await authService.resetPasswordForEmail(email, redirectTo);
    if (error) throw error;
    showToast("Enviamos o link de recuperação para seu e-mail.");
  } catch (error) {
    console.error(error);
    showToast(getErrorMessage(error));
  } finally {
    showLoading(false);
  }
}

export async function completePasswordRecovery(): Promise<void> {
  const nextPassword = (document.getElementById("passwordRecoveryNew") as HTMLInputElement | null)?.value.trim() || "";
  const confirmPassword = (document.getElementById("passwordRecoveryConfirm") as HTMLInputElement | null)?.value.trim() || "";

  if (!nextPassword || !confirmPassword) {
    showToast("Preencha e confirme a nova senha.");
    return;
  }
  if (nextPassword.length < 6) {
    showToast("A nova senha deve ter pelo menos 6 caracteres.");
    return;
  }
  if (nextPassword !== confirmPassword) {
    showToast("A confirmação da senha não confere.");
    return;
  }

  showLoading(true);
  try {
    const { error } = await authService.updatePassword(nextPassword);
    if (error) throw error;
    closePasswordRecoveryModal();
    showToast("Senha atualizada com sucesso.");
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
    plan_tier: normalizeSignupPlan((document.getElementById("signupPlanTier") as HTMLSelectElement | null)?.value),
    email: (document.getElementById("signupEmail") as HTMLInputElement).value.trim(),
    password: (document.getElementById("signupPass") as HTMLInputElement).value.trim(),
  };
  const businessDraft = {
    ...draft,
    plan_name: planNameFromTier(draft.plan_tier),
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
      localStorage.setItem("agendafacil_pending_setup", JSON.stringify(businessDraft));
    }
    const { data, error } = await authService.signUp(draft.email, draft.password, {
      data: isSupportSignup
        ? {}
        : {
            pending_business: {
              name: draft.name,
              slug: draft.slug,
              category: draft.category,
              plan_tier: draft.plan_tier,
              plan_name: planNameFromTier(draft.plan_tier),
            },
          },
    });
    if (error) throw error;

    if (data.session?.user) {
      state.session = data.session;
      state.user = data.user;
      if (!isSupportSignup) {
        await createBusinessAndSeed(businessDraft);
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
