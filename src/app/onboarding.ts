import { state } from "../state/store";
import { closeModal, openModal } from "../ui/dom";
import { navTo } from "./navigation";

const STORAGE_KEY = "agendafacil_onboarding";
const HIGHLIGHT_CLASS = "onboarding-highlight";

type OnboardingProgress = {
  businessId: string;
  step: number;
};

type OnboardingStep = {
  pageId: string;
  title: string;
  description: string;
  bullets: string[];
  highlightIds: string[];
  openDetailsIds?: string[];
  primaryLabel: string;
};

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    pageId: "pageMeuNegocio",
    title: "Comece pelos dados do salão",
    description: "Preencha as informações principais para deixar sua página mais completa e profissional.",
    bullets: [
      "Adicione uma boa descrição do seu salão.",
      "Preencha WhatsApp, Instagram e endereço.",
      "Envie a logo do salão para personalizar a experiência.",
    ],
    highlightIds: ["businessInfoAccordion", "businessInfoCard"],
    openDetailsIds: ["businessInfoAccordion"],
    primaryLabel: "Próximo",
  },
  {
    pageId: "pageMeuNegocio",
    title: "Agora ajuste os horários de funcionamento",
    description: "Esses horários definem quando sua agenda pode receber reservas.",
    bullets: [
      "Ative apenas os dias em que o salão realmente funciona.",
      "Configure abertura e fechamento de cada dia.",
      "Revise tudo antes de salvar as alterações.",
    ],
    highlightIds: ["businessHoursAccordion", "businessHoursCard"],
    openDetailsIds: ["businessHoursAccordion"],
    primaryLabel: "Próximo",
  },
  {
    pageId: "pageAtendimento",
    title: "Revise os serviços do salão",
    description: "Na página Atendimento, ajuste os serviços modelo e crie novos serviços se precisar.",
    bullets: [
      "Edite nome, descrição, preço e duração dos serviços existentes.",
      "Organize os serviços por categoria para facilitar a vitrine.",
      "Cadastre novos serviços caso seu salão ofereça mais opções.",
    ],
    highlightIds: ["servicesOnboardingSection"],
    primaryLabel: "Próximo",
  },
  {
    pageId: "pageAtendimento",
    title: "Configure sua equipe disponível",
    description: "Finalize cadastrando quem atende no salão e como a agenda de cada pessoa funciona.",
    bullets: [
      "Defina a especialidade e os serviços realizados por cada profissional.",
      "Configure dia fixo de folga, almoço e férias quando houver.",
      "Depois disso, salve tudo e sua operação já estará pronta para começar.",
    ],
    highlightIds: ["professionalsOnboardingSection"],
    primaryLabel: "Concluir",
  },
];

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

function clearHighlights(): void {
  document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((element) => element.classList.remove(HIGHLIGHT_CLASS));
}

function applyHighlights(step: OnboardingStep): void {
  clearHighlights();
  step.highlightIds.forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.classList.add(HIGHLIGHT_CLASS);
    }
  });
  const firstTarget = step.highlightIds.map((id) => document.getElementById(id)).find(Boolean);
  firstTarget?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function fillOnboardingModal(stepIndex: number): void {
  const step = ONBOARDING_STEPS[stepIndex];
  const title = document.getElementById("onboardingModalTitle");
  const description = document.getElementById("onboardingModalDescription");
  const list = document.getElementById("onboardingModalList");
  const progress = document.getElementById("onboardingModalProgress");
  const primaryButton = document.getElementById("onboardingPrimaryButton") as HTMLButtonElement | null;
  if (title) title.textContent = step.title;
  if (description) description.textContent = step.description;
  if (list) {
    list.innerHTML = step.bullets.map((item) => `<li>${item}</li>`).join("");
  }
  if (progress) {
    progress.textContent = `Passo ${stepIndex + 1} de ${ONBOARDING_STEPS.length}`;
  }
  if (primaryButton) {
    primaryButton.textContent = step.primaryLabel;
  }
}

function syncOnboardingStep(stepIndex: number): void {
  const step = ONBOARDING_STEPS[stepIndex];
  step.openDetailsIds?.forEach((id) => {
    const details = document.getElementById(id);
    if (details instanceof HTMLDetailsElement) {
      details.open = true;
    }
  });
  navTo(step.pageId);
  fillOnboardingModal(stepIndex);
  applyHighlights(step);
  openModal("modalOnboardingGuide");
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
    clearHighlights();
    return;
  }
  syncOnboardingStep(progress.step);
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
  syncOnboardingStep(nextStep);
}

export function closeOnboarding(): void {
  localStorage.removeItem(STORAGE_KEY);
  clearHighlights();
  closeModal("modalOnboardingGuide");
}
