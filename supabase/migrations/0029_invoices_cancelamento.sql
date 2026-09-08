-- Campos de cancelamento pra NFS-e (invoices) — notas_produto (NF-e/NFC-e)
-- já tem os equivalentes (cancelada_em, justificativa_cancelamento) desde
-- 0026_notas_produto.sql; faltava só do lado de serviço.
alter table public.invoices
  add column if not exists cancelada_em timestamptz,
  add column if not exists motivo_cancelamento text,
  add column if not exists protocolo_cancelamento text;
