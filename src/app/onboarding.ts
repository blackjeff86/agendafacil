import { state } from "../state/store";
import { navTo } from "./navigation";

const STORAGE_KEY = "agendafacil_onboarding";
const HIGHLIGHT_CLASS = "onboarding-highlight";
const GUIDE_MARGIN = 12;

type OnboardingProgress = {
  businessId: string;
  step: number;
};

type OnboardingStep = {
  pageId: string;
  title: string;
  description: string;
  targetId: string;
  openDetailsIds?: string[];
  primaryLabel?: string;
};

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    pageId: "pageMeuNegocio",
    title: "Descrição do salão",
    description: "Comece por aqui. Nesse campo você explica rapidamente o que seu salão oferece.",
    targetId: "businessDescription",
    openDetailsIds: ["businessInfoAccordion"],
  },
  {
    pageId: "pageMeuNegocio",
    title: "WhatsApp",
    description: "Aqui você informa o número principal para contato com os clientes.",
    targetId: "businessWhatsapp",
    openDetailsIds: ["businessInfoAccordion"],
  },
  {
    pageId: "pageMeuNegocio",
    title: "Instagram",
    description: "Preencha seu Instagram para deixar a página pública mais completa.",
    targetId: "businessInstagram",
    openDetailsIds: ["businessInfoAccordion"],
  },
  {
    pageId: "pageMeuNegocio",
    title: "Endereço",
    description: "Use este campo para mostrar onde o salão atende.",
    targetId: "businessAddress",
    openDetailsIds: ["businessInfoAccordion"],
  },
  {
    pageId: "pageMeuNegocio",
    title: "Logo do salão",
    description: "Envie a logo aqui para personalizar o visual do seu espaço no sistema.",
    targetId: "businessLogoFile",
    openDetailsIds: ["businessInfoAccordion"],
  },
  {
    pageId: "pageMeuNegocio",
    title: "Horários de funcionamento",
    description: "Nesta seção você define os dias e horários em que a agenda pode receber reservas.",
    targetId: "businessHoursCard",
    openDetailsIds: ["businessHoursAccordion"],
  },
  {
    pageId: "pageAtendimento",
    title: "Serviços do salão",
    description: "Aqui ficam os serviços modelo. Você pode revisar os que já existem e ajustar nome, preço e duração.",
    targetId: "servicosList",
  },
  {
    pageId: "pageAtendimento",
    title: "Novo serviço",
    description: "Se precisar cadastrar mais opções, use este botão para criar um novo serviço.",
    targetId: "btnAddService",
  },
  {
    pageId: "pageAtendimento",
    title: "Equipe disponível",
    description: "Aqui você revisa os profissionais da equipe e ajusta especialidade e serviços realizados.",
    targetId: "profissionaisList",
  },
  {
    pageId: "pageAtendimento",
    title: "Novo profissional",
    description: "Use este botão para cadastrar outro profissional e depois preencher folga, almoço e férias no modal.",
    targetId: "btnAddProfessional",
    primaryLabel: "Concluir",
  },
];

let listenersBound = false;

function readProgress(): OnboardingProgress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OnboardingProgress) : null;
  } catch {
    return null;
  }
}

function writeProgress(progress: OnboardingProgress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function getCurrentProgress(): OnboardingProgress | null {
  const progress = readProgress();
  if (!progress || !state.business || progress.businessId !== state.business.id) {
    if (progress && state.business && progress.businessId !== state.business.id) {
      localStorage.removeItem(STORAGE_KEY);
    }
    return null;
  }
  if (progress.step < 0 || progress.step >= ONBOARDING_STEPS.length) {
    return { businessId: state.business.id, step: 0 };
  }
  return progress;
}

function getGuideElement(): HTMLElement | null {
  return document.getElementById("onboardingGuide");
}

function resolveTargetElement(targetId: string): HTMLElement | null {
  const target = document.getElementById(targetId);
  if (!target) return null;
  return (target.closest(".input-group") as HTMLElement | null) || target;
}

function clearHighlights(): void {
  document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((element) => element.classList.remove(HIGHLIGHT_CLASS));
}

function applyHighlight(targetId: string): HTMLElement | null {
  clearHighlights();
  const element = resolveTargetElement(targetId);
  if (element) {
    element.classList.add(HIGHLIGHT_CLASS);
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  return element;
}

function fillGuide(stepIndex: number): void {
  const step = ONBOARDING_STEPS[stepIndex];
  const title = document.getElementById("onboardingGuideTitle");
  const description = document.getElementById("onboardingGuideDescription");
  const progress = document.getElementById("onboardingGuideProgress");
  const primaryButton = document.getElementById("onboardingPrimaryButton") as HTMLButtonElement | null;
  if (title) title.textContent = step.title;
  if (description) description.textContent = step.description;
  if (progress) progress.textContent = `Passo ${stepIndex + 1} de ${ONBOARDING_STEPS.length}`;
  if (primaryButton) {
    primaryButton.textContent = step.primaryLabel || "Próxima dica";
  }
}

function positionGuide(target: HTMLElement | null): void {
  const guide = getGuideElement();
  if (!guide) return;

  if (!target) {
    guide.style.top = "auto";
    guide.style.left = "12px";
    guide.style.right = "12px";
    guide.style.bottom = "12px";
    guide.dataset.placement = "top";
    return;
  }

  guide.style.right = "auto";
  guide.style.bottom = "auto";
  const rect = target.getBoundingClientRect();
  const guideRect = guide.getBoundingClientRect();

  let top = rect.bottom + GUIDE_MARGIN;
  let placement: "top" | "bottom" = "bottom";
  if (top + guideRect.height > window.innerHeight - GUIDE_MARGIN) {
    top = rect.top - guideRect.height - GUIDE_MARGIN;
    placement = "top";
  }
  if (top < GUIDE_MARGIN) {
    top = Math.max(GUIDE_MARGIN, Math.min(window.innerHeight - guideRect.height - GUIDE_MARGIN, rect.bottom + GUIDE_MARGIN));
    placement = "bottom";
  }

  const maxLeft = Math.max(GUIDE_MARGIN, window.innerWidth - guideRect.width - GUIDE_MARGIN);
  const left = Math.min(Math.max(rect.left, GUIDE_MARGIN), maxLeft);
  guide.style.top = `${top}px`;
  guide.style.left = `${left}px`;
  guide.dataset.placement = placement;
}

function renderCurrentStep(): void {
  const progress = getCurrentProgress();
  const guide = getGuideElement();
  if (!progress || !guide) return;
  const step = ONBOARDING_STEPS[progress.step];

  navTo(step.pageId);
  step.openDetailsIds?.forEach((id) => {
    const details = document.getElementById(id);
    if (details instanceof HTMLDetailsElement) {
      details.open = true;
    }
  });

  fillGuide(progress.step);
  guide.classList.remove("hidden");

  window.requestAnimationFrame(() => {
    const target = applyHighlight(step.targetId);
    positionGuide(target);
  });
}

function repositionGuideIfOpen(): void {
  const guide = getGuideElement();
  if (!guide || guide.classList.contains("hidden")) return;
  const progress = getCurrentProgress();
  if (!progress) return;
  positionGuide(resolveTargetElement(ONBOARDING_STEPS[progress.step].targetId));
}

function bindGuideListeners(): void {
  if (listenersBound) return;
  listenersBound = true;
  window.addEventListener("resize", repositionGuideIfOpen);
  document.querySelectorAll(".scroll-area").forEach((container) => {
    container.addEventListener("scroll", repositionGuideIfOpen, { passive: true });
  });
}

export function markBusinessOnboardingPending(businessId: string): void {
  writeProgress({ businessId, step: 0 });
}

export function getInitialAdminPage(): string {
  const progress = getCurrentProgress();
  return progress ? ONBOARDING_STEPS[progress.step].pageId : "pageDashboard";
}

export function startPendingOnboarding(): void {
  if (state.isPlatformAdmin || !state.business) return;
  const progress = getCurrentProgress();
  if (!progress) {
    closeOnboarding();
    return;
  }
  bindGuideListeners();
  renderCurrentStep();
}

export function restartOnboarding(): void {
  if (!state.business || state.isPlatformAdmin) return;
  writeProgress({ businessId: state.business.id, step: 0 });
  bindGuideListeners();
  renderCurrentStep();
}

export function nextOnboardingStep(): void {
  if (!state.business) return;
  const progress = getCurrentProgress();
  if (!progress) return;
  const nextStep = progress.step + 1;
  if (nextStep >= ONBOARDING_STEPS.length) {
    closeOnboarding();
    return;
  }
  writeProgress({ businessId: state.business.id, step: nextStep });
  renderCurrentStep();
}

export function closeOnboarding(): void {
  localStorage.removeItem(STORAGE_KEY);
  clearHighlights();
  getGuideElement()?.classList.add("hidden");
}
