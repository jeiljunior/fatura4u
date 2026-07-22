-- Liga cobrança confirmada -> emissão automática de nota fiscal. Opt-in por
-- tenant (default false).
alter table public.faturamento_config
  add column if not exists emissao_automatica boolean not null default false;
