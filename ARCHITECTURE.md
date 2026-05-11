# Frontend x Backend

Este projeto foi organizado para evitar que o navegador concentre regras pesadas, automações e tarefas de operação.

## Frontend

Responsável por:

- renderização da interface
- navegação entre páginas
- formulários e validações simples de UX
- leitura de dados necessários para o painel do lojista
- disparo de ações do usuário

Pastas principais:

- `src/ui/`
- `src/app/`
- `src/state/`

O frontend **não deve** concentrar:

- rotinas automáticas agendadas
- envio automático em lote
- segredos de integração
- regras de cobrança
- lógica operacional pesada

## Backend

Responsável por:

- envio automático de WhatsApp
- cron jobs
- uso de credenciais seguras
- integração com Meta / Supabase fora do browser
- rotinas periódicas de trial, cobrança e lembretes

Pontos atuais:

- `supabase/functions/whatsapp-send`
  - backend de envio WhatsApp
- `api/cron/appointment-reminders.ts`
  - lembrete D-1 de clientes finais
- `api/cron/trial-ending-reminders.ts`
  - aviso D-2 de fim de teste para lojistas

## Banco / Supabase

Responsável por:

- persistência dos dados
- leitura e atualização de agenda
- suporte a automações
- histórico de eventos do suporte

## Regras atuais de plano

### Starter

- até `2` profissionais ativos
- até `50` clientes carregados no painel
- relatórios resumidos
- sem automações automáticas de WhatsApp

### Pro

- múltiplos profissionais
- gestão completa de clientes
- relatórios completos
- automações automáticas de WhatsApp

## Diretriz de performance

Para evitar degradação com o crescimento da base:

1. tudo que for agendado/automático deve rodar no backend
2. o frontend deve receber somente o necessário para a tela atual
3. listas grandes devem ser limitadas, paginadas ou agregadas no backend
4. relatórios mais pesados devem evoluir para consultas agregadas no backend
5. envs e tokens devem permanecer fora do browser, exceto `VITE_*` estritamente necessários para leitura pública

## Próximos passos recomendados

- mover agregações maiores de relatórios para RPC/SQL no Supabase
- paginar agendamentos históricos
- separar endpoints de leitura resumida para dashboard
- registrar entrega/erro das automações em tabela própria
