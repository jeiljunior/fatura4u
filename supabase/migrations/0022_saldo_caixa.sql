-- Saldo em caixa: valor informado manualmente pelo tenant (não vem de
-- conciliação bancária nem Open Finance — é só o ponto de partida pra
-- calcular o saldo projetado, somando contas a receber e subtraindo
-- contas a pagar pendentes dentro de uma janela de dias).
alter table public.businesses
  add column if not exists saldo_caixa_cents integer not null default 0;
