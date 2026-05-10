# Próximos passos — Agenda Fácil

Checklist do que ainda falta **fora do código** (deploy, credenciais, SQL) para você continuar depois.

## Banco (Supabase)

- [ ] Rodar no **SQL Editor** do Supabase o `schema.sql` completo **ou** só os trechos que ainda não existem no seu projeto:
  - `plan_tier`, `trial_ends_at`, `next_billing_at`, `reminder_sent_at` em `businesses` / `appointments`
  - Constraint de `billing_status` incluindo `pendente`
  - Índice de lembrete D-1 (`idx_appointments_reminder_day`)
- [ ] (Opcional) Promover uma loja existente ao **Pro R$ 59,90**: no final do `schema.sql` há `UPDATE` comentado — ajuste `slug` ou nome e execute.

## Vercel — variáveis de ambiente

- [ ] **Front (obrigatório em produção):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (Settings → API no Supabase).
- [ ] **Já comuns:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] **URL do app (opcional):** `VITE_APP_BASE_URL` = URL de produção na Vercel.
- [ ] **PIX / suporte:** `VITE_AGENDAFACIL_PIX_KEY` (chave PIX da plataforma nas mensagens de renovação).
- [ ] **Cron lembretes D-1:** `CRON_SECRET` (string forte, ex. `openssl rand -hex 32`) — a Vercel envia no header do cron.
- [ ] **WhatsApp automático:** após deploy da Edge Function (abaixo), configurar:
  - `VITE_WHATSAPP_EDGE_URL` e `WHATSAPP_EDGE_URL` = URL da função `whatsapp-send`
  - `VITE_WHATSAPP_EDGE_TOKEN` e `WHATSAPP_EDGE_TOKEN` = mesmo valor de `WHATSAPP_EDGE_AUTH_TOKEN` no Supabase

## Meta + Supabase Edge (WhatsApp API)

- [ ] Criar app **WhatsApp** em [developers.facebook.com](https://developers.facebook.com), obter token e **Phone number ID**.
- [ ] CLI: `supabase login` → `supabase link --project-ref <REF>` → `supabase secrets set` com `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_EDGE_AUTH_TOKEN`.
- [ ] Deploy: `supabase functions deploy whatsapp-send`
- [ ] Testar com o `curl` documentado no `.env.example`.
- [ ] Em modo teste da Meta, cadastrar números de destino permitidos.

## Pós-deploy

- [ ] Redeploy na Vercel após alterar variáveis `VITE_*`.
- [ ] Confirmar que o **cron** aparece no painel Vercel (path `/api/cron/appointment-reminders`) e que `CRON_SECRET` está definido se quiser o job protegido.

## Retomar ambiente local

- [ ] Quando formos voltar a testar localmente, executar `npm run dev`.
- [x] Dependências já instaladas em `2026-05-10`.
- [x] Build local validado com `npm run build` em `2026-05-10`.

## Melhorias futuras (produto / código)

- [ ] Integração de **pagamento** (PIX com confirmação automática ou gateway).
- [ ] **Templates** aprovados na Meta para primeiro contato / fora da janela de 24h.
- [ ] Painel de suporte: filtro “**Pendentes**” de cobrança na lista de lojas (se fizer sentido).
- [ ] Revisar **segurança**: não expor `VITE_WHATSAPP_EDGE_TOKEN` em builds públicos em cenários sensíveis — preferir só chamadas server-side quando possível.

---

Detalhes técnicos e exemplos de comandos continuam em **`.env.example`**.
