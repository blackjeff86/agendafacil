import "./styles/global.css";
import { bootstrapApp } from "./app/bootstrap";
import { registerWindowActions } from "./app/registerWindow";
import { initStaticSetup } from "./app/staticSetup";
import { setTodayDate } from "./ui/dom";

document.addEventListener("DOMContentLoaded", async () => {
  registerWindowActions();
  initStaticSetup();
  setTodayDate();
  await bootstrapApp();
});
