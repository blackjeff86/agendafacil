import { SUPABASE_ANON_KEY } from "../config/env";
import { buildWhatsAppWebUrlWithText } from "../utils/phone";

/**
 * Envio de texto WhatsApp.
 * - Se `VITE_WHATSAPP_EDGE_URL` estiver definido: POST com `{ phone, text }`.
 * - Supabase Edge (`…supabase.co/functions/…`): use `Authorization: Bearer <anon>` (gateway) +
 *   `x-agenda-facil-proxy-secret` quando `VITE_WHATSAPP_EDGE_TOKEN` estiver definido (igual ao secret da função).
 * - Outro backend: `Authorization: Bearer VITE_WHATSAPP_EDGE_TOKEN` se houver token.
 * - Sem URL: abre `wa.me` (uma aba por envio).
 */
function isSupabaseEdgeFunctionUrl(url: string): boolean {
  return url.includes("supabase.co/functions/");
}

export async function sendWhatsAppText(rawPhone: string, body: string): Promise<{ ok: boolean; usedApi: boolean }> {
  const edgeUrl = String(import.meta.env.VITE_WHATSAPP_EDGE_URL || "").trim();
  if (edgeUrl) {
    try {
      const proxySecret = String(import.meta.env.VITE_WHATSAPP_EDGE_TOKEN || "").trim();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (isSupabaseEdgeFunctionUrl(edgeUrl)) {
        const anon = String(SUPABASE_ANON_KEY || "").trim();
        if (!anon) return { ok: false, usedApi: true };
        headers.Authorization = `Bearer ${anon}`;
        if (proxySecret) headers["x-agenda-facil-proxy-secret"] = proxySecret;
      } else if (proxySecret) {
        headers.Authorization = `Bearer ${proxySecret}`;
      }
      const res = await fetch(edgeUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ phone: rawPhone, text: body }),
      });
      return { ok: res.ok, usedApi: true };
    } catch {
      return { ok: false, usedApi: true };
    }
  }

  const url = buildWhatsAppWebUrlWithText(rawPhone, body);
  if (!url) return { ok: false, usedApi: false };
  window.open(url, "_blank", "noopener,noreferrer");
  return { ok: true, usedApi: false };
}
