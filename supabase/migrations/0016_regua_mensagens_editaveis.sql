-- Mensagens da régua de cobrança editáveis pelo tenant, uma pra cada
-- momento do lembrete (antes/no dia/depois do vencimento). Nulo = usa o
-- texto padrão hardcoded em lib/faturamento/regua.ts.
alter table public.faturamento_config
  add column if not exists regua_msg_antes text,
  add column if not exists regua_msg_hoje text,
  add column if not exists regua_msg_atraso text;
