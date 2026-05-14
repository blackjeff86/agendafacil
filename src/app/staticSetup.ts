import { formatBrazilPhone } from "../utils/phone";
import { slugify } from "../utils/strings";
import { runPendingConfirmAction } from "./appointmentActions";
import { switchAuthMode, syncEntryViewFromUrl, syncSignupFormMode } from "./authUi";
import { showPublicBooking } from "./publicFlow";

export function initStaticSetup(): void {
  const signupBusinessName = document.getElementById("signupBusinessName");
  const signupSlug = document.getElementById("signupSlug") as HTMLInputElement | null;
  const signupEmail = document.getElementById("signupEmail");
  const setupBusinessName = document.getElementById("setupBusinessName");
  const setupSlug = document.getElementById("setupSlug") as HTMLInputElement | null;

  signupBusinessName?.addEventListener("input", () => {
    if (signupSlug && !signupSlug.dataset.edited) {
      signupSlug.value = slugify((signupBusinessName as HTMLInputElement).value);
    }
  });
  setupBusinessName?.addEventListener("input", () => {
    if (setupSlug && !setupSlug.dataset.edited) {
      setupSlug.value = slugify((setupBusinessName as HTMLInputElement).value);
    }
  });
  signupSlug?.addEventListener("input", () => {
    signupSlug.dataset.edited = "1";
  });
  signupEmail?.addEventListener("input", () => {
    syncSignupFormMode();
  });
  setupSlug?.addEventListener("input", () => {
    setupSlug.dataset.edited = "1";
  });

  document.getElementById("tabLogin")?.addEventListener("click", () => switchAuthMode("login"));
  document.getElementById("tabSignup")?.addEventListener("click", () => switchAuthMode("signup"));
  document.getElementById("btnPublicPreview")?.addEventListener("click", () => void showPublicBooking());
  document.getElementById("confirmActionButton")?.addEventListener("click", () => void runPendingConfirmAction());

  document.querySelectorAll("[data-br-phone='true']").forEach((input) => {
    input.addEventListener("input", () => {
      (input as HTMLInputElement).value = formatBrazilPhone((input as HTMLInputElement).value);
    });
    input.addEventListener("blur", () => {
      (input as HTMLInputElement).value = formatBrazilPhone((input as HTMLInputElement).value);
    });
  });

  document.querySelectorAll(".modal-overlay").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        const appWindow = window as unknown as { closeHourFreezeModal?: () => void; closeOnboarding?: () => void };
        if ((modal as HTMLElement).id === "modalHourFreeze" && typeof appWindow.closeHourFreezeModal === "function") {
          appWindow.closeHourFreezeModal();
        } else if ((modal as HTMLElement).id === "modalOnboardingGuide" && typeof appWindow.closeOnboarding === "function") {
          appWindow.closeOnboarding();
        } else {
          modal.classList.remove("open");
        }
      }
    });
  });

  document.addEventListener("click", (event) => {
    const insideMenu = (event.target as HTMLElement).closest(".card-menu");
    document.querySelectorAll(".card-menu").forEach((menu) => {
      if (!insideMenu || menu !== insideMenu) {
        menu.classList.remove("open");
      }
    });
  });

  window.addEventListener("popstate", () => {
    syncEntryViewFromUrl();
  });

  syncSignupFormMode();
}
