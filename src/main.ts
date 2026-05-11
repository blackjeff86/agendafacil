import "./styles/global.css";
import { bootstrapApp } from "./app/bootstrap";
import { registerWindowActions } from "./app/registerWindow";
import { initStaticSetup } from "./app/staticSetup";
import { applyBodyMode, finishInitialBoot, setTodayDate } from "./ui/dom";

document.addEventListener("DOMContentLoaded", async () => {
  const bootFailsafe = window.setTimeout(() => {
    if (document.body.classList.contains("app-booting")) {
      finishInitialBoot();
      document.getElementById("landingPage")?.classList.remove("hidden");
      applyBodyMode("landing");
    }
  }, 2500);

  registerWindowActions();
  initStaticSetup();
  setTodayDate();
  try {
    await bootstrapApp();
  } finally {
    window.clearTimeout(bootFailsafe);
  }
});
