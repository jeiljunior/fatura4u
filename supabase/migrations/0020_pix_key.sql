-- Chave PIX própria do tenant, usada pra gerar o código copia-e-cola/QR do
-- PIX Avulso (fora do gateway, sem depender de Asaas/Mercado Pago).
alter table public.faturamento_config add column if not exists pix_key text;
