-- Cadastro completo de produto, além dos campos fiscais mínimos pra NF-e/
-- NFC-e já criados em 0025_produtos.sql: código interno (SKU), embalagem,
-- fornecedor e preço de custo (pra apurar margem) — separado do preço de
-- venda, que é o que efetivamente entra na nota fiscal.
alter table public.produtos
  rename column preco_cents to preco_venda_cents;

alter table public.produtos
  add column if not exists codigo text,
  add column if not exists embalagem text,
  add column if not exists fornecedor text,
  add column if not exists preco_custo_cents int;

create index if not exists idx_produtos_codigo on public.produtos (business_id, codigo);
