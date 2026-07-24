-- Cobrança "PIX Avulso": tenant recebe fora do gateway (chave PIX própria) e
-- só registra no sistema já como paga, sem QR Code nem confirmação
-- automática — dispara a emissão de nota fiscal na hora, se configurado.
alter table public.charges drop constraint charges_provider_check;
alter table public.charges add constraint charges_provider_check
  check (provider in ('asaas', 'stripe', 'pagarme', 'mercadopago', 'manual'));

alter table public.charges drop constraint charges_billing_type_check;
alter table public.charges add constraint charges_billing_type_check
  check (billing_type in ('pix', 'boleto', 'cartao', 'pix_avulso'));
