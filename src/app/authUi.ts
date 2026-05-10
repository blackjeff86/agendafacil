import { isSupportAccountEmail } from "../ui/render/supportPanel";

export function switchAuthMode(mode: "login" | "signup"): void {
  const isLogin = mode === "login";
  document.getElementById("tabLogin")?.classList.toggle("active", isLogin);
  document.getElementById("tabSignup")?.classList.toggle("active", !isLogin);
  document.getElementById("loginForm")?.classList.toggle("hidden", !isLogin);
  document.getElementById("signupForm")?.classList.toggle("hidden", isLogin);
  if (!isLogin) {
    syncSignupFormMode();
  }
}

export function syncSignupFormMode(): void {
  const emailEl = document.getElementById("signupEmail") as HTMLInputElement | null;
  const isSupportSignup = isSupportAccountEmail(emailEl?.value || "");
  const businessFields = document.getElementById("signupBusinessFields");
  const supportNote = document.getElementById("supportSignupNote");
  const submitButton = document.getElementById("signupSubmitButton");
  const businessName = document.getElementById("signupBusinessName") as HTMLInputElement | null;
  const slug = document.getElementById("signupSlug") as HTMLInputElement | null;

  if (!businessFields || !supportNote || !submitButton || !businessName || !slug) {
    return;
  }

  businessFields.classList.toggle("hidden", isSupportSignup);
  supportNote.classList.toggle("hidden", !isSupportSignup);
  businessName.required = !isSupportSignup;
  slug.required = !isSupportSignup;
  submitButton.textContent = isSupportSignup ? "Criar conta de suporte" : "Criar conta e negócio";
}
