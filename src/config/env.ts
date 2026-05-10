/** Fallbacks preservam o deploy atual; sobrescreva com variáveis VITE_* no Vercel quando quiser. */
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://vjwrgibbirtaeyqbzoxk.supabase.co";

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_ha-xTX201rlnk1_eVm46pg_XZOrdl3v";

export function getAppBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_APP_BASE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return window.location.origin.replace(/\/$/, "");
  return "https://agendafacil-two.vercel.app";
}

export const SUPPORT_ACCOUNT_EMAIL = "agendafacil26@gmail.com";
export const STANDARD_MONTHLY_PRICE = 49.9;
export const SUPPORT_PAGE_SIZE = 6;

/** Chave PIX da plataforma (ex.: CNPJ, e-mail ou telefone) — usada nas mensagens de renovação do suporte. */
export const AGENDAFACIL_PIX_KEY = String(import.meta.env.VITE_AGENDAFACIL_PIX_KEY || "").trim();

/** Quantos dias à frente (e vencidos) entram na lista de renovações do suporte. */
export const RENEWAL_REMINDER_WINDOW_DAYS = Math.max(1, Number(import.meta.env.VITE_RENEWAL_REMINDER_WINDOW_DAYS) || 7);

/** Ao marcar “pagamento recebido” no suporte, próxima renovação = hoje + N dias. */
export const DEFAULT_BILLING_CYCLE_DAYS = Math.max(1, Number(import.meta.env.VITE_DEFAULT_BILLING_CYCLE_DAYS) || 30);
