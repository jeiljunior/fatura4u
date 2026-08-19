// Módulo Faturamento — tipos compartilhados.
// Cobrança e nota fiscal que o TENANT emite para os próprios clientes finais,
// usando o gateway de pagamento e o CNPJ/CPF do próprio tenant.

export type GatewayProvider = 'asaas' | 'stripe' | 'pagarme' | 'mercadopago'

export type BillingType = 'pix' | 'boleto' | 'cartao' | 'pix_avulso'

export type ChargeStatus = 'pendente' | 'confirmada' | 'recebida' | 'vencida' | 'cancelada'

export type InvoiceStatus = 'rascunho' | 'processando' | 'autorizada' | 'rejeitada' | 'cancelada'

export type RegimeTributario = 'mei' | 'simples' | 'normal'

export type Ambiente = 'homologacao' | 'producao'

export type CredenciamentoStatus = 'pendente' | 'habilitado' | 'erro'

// '55' = NF-e (destinatário PJ/PF plenamente identificado, uso B2B).
// '65' = NFC-e (venda ao consumidor final, destinatário opcional).
export type ModeloNota = '55' | '65'

export type NotaProdutoStatus = 'rascunho' | 'processando' | 'autorizada' | 'rejeitada' | 'denegada' | 'cancelada'

// Linha da tabela faturamento_config
export type FaturamentoConfig = {
  id: string
  business_id: string
  active: boolean
  inscricao_municipal: string | null
  regime_tributario: RegimeTributario | null
  codigo_servico_padrao: string | null
  aliquota_iss_padrao: number | null
  ambiente: Ambiente
  credenciamento_status: CredenciamentoStatus
  certificado_valido_ate: string | null
  municipio_ibge: string | null
  serie_dps: string
  codigo_nbs: string | null
  emissao_automatica: boolean
  // Campos de NF-e/NFC-e (nota de produto, ICMS/estadual) — independentes
  // dos campos de NFS-e acima (nota de serviço, ISS/municipal).
  uf: string | null
  inscricao_estadual: string | null
  serie_nfe: string
  serie_nfce: string
  csc_id: string | null
  // csc_token nunca é devolvido em claro pro client — só csc_token_enc
  // (criptografado, mesmo padrão de certificados_digitais.pfx) fica no banco.
  created_at: string
  updated_at: string
}

// Linha da tabela produtos — catálogo de mercadorias do tenant, usado na
// emissão de NF-e/NFC-e (equivalente a `servicos` pra NFS-e).
export type Produto = {
  id: string
  business_id: string
  codigo: string | null // código/SKU interno, uso do tenant (não é o mesmo que NCM)
  nome: string
  descricao: string | null
  embalagem: string | null // ex: "Caixa c/ 12", "Fardo", "Unidade" — texto livre
  fornecedor: string | null
  preco_custo_cents: number | null
  preco_venda_cents: number | null // o que entra na nota fiscal
  ncm: string | null
  cfop: string | null
  unidade: string
  cest: string | null
  origem_mercadoria: string
  icms_situacao_tributaria: string | null
  aliquota_icms: number | null
  ativo: boolean
  created_at: string
  updated_at: string
}

// Linha da tabela notas_produto (header) — nota de NF-e/NFC-e propriamente
// dita. Itens ficam em NotaProdutoItem, tabela separada (uma nota pode ter
// vários produtos, diferente de `invoices`/NFS-e que é sempre 1 serviço).
export type NotaProduto = {
  id: string
  business_id: string
  customer_id: string | null
  charge_id: string | null
  modelo: ModeloNota
  serie: string
  numero: number
  status: NotaProdutoStatus
  natureza_operacao: string
  ambiente: Ambiente
  valor_produtos: number
  valor_icms: number | null
  valor_total: number
  protocolo_autorizacao: string | null
  chave_acesso: string | null
  qrcode_url: string | null
  xml_url: string | null
  danfe_url: string | null
  motivo_rejeicao: string | null
  cancelada_em: string | null
  justificativa_cancelamento: string | null
  created_at: string
  updated_at: string
}

// Linha da tabela notas_produto_itens — snapshot dos dados fiscais do
// produto no momento da emissão (não reflete edições posteriores no
// catálogo).
export type NotaProdutoItem = {
  id: string
  nota_id: string
  produto_id: string | null
  numero_item: number
  descricao: string
  ncm: string
  cfop: string
  unidade: string
  quantidade: number
  valor_unitario: number
  valor_total: number
  origem_mercadoria: string
  icms_situacao_tributaria: string
  aliquota_icms: number | null
  valor_icms: number | null
  created_at: string
}

// Linha da tabela gateway_credentials (credentials nunca deve ser exposta pro client)
export type GatewayCredential = {
  id: string
  business_id: string
  provider: GatewayProvider
  active: boolean
  created_at: string
  updated_at: string
}

// Linha da tabela charges
export type Charge = {
  id: string
  business_id: string
  customer_id: string
  provider: GatewayProvider
  provider_charge_id: string | null
  valor_cents: number
  billing_type: BillingType | null
  status: ChargeStatus
  due_date: string | null
  paid_at: string | null
  pix_qr_code: string | null
  pix_payload: string | null
  boleto_url: string | null
  payment_link: string | null
  created_at: string
  updated_at: string
}

// Linha da tabela invoices
export type Invoice = {
  id: string
  business_id: string
  customer_id: string
  charge_id: string | null
  status: InvoiceStatus
  valor_servicos: number
  codigo_servico: string | null
  aliquota: number | null
  valor_iss: number | null
  protocolo_adn: string | null
  chave_acesso: string | null
  xml_url: string | null
  danfse_url: string | null
  motivo_rejeicao: string | null
  created_at: string
  updated_at: string
}

// Interface única que todo gateway (Asaas, Stripe, Pagar.me, Mercado Pago) implementa.
// O tenant escolhe qual usar em faturamento_config/gateway_credentials — o resto do
// sistema chama sempre essa interface, nunca um provedor específico direto.
export interface PaymentGateway {
  createCustomer(params: GatewayCustomerParams): Promise<{ id: string }>
  createCharge(params: GatewayChargeParams): Promise<GatewayChargeResult>
  cancelCharge(providerChargeId: string): Promise<void>
  getPixQrCode?(providerChargeId: string): Promise<{ qrCode: string; payload: string }>
}

export type GatewayCustomerParams = {
  name: string
  document: string // CPF/CNPJ do cliente final do tenant
  email?: string
  phone?: string
}

export type GatewayChargeParams = {
  providerCustomerId: string
  valueCents: number
  // 'pix_avulso' nunca passa por aqui — é registrado direto em charges sem
  // tocar o gateway (ver criarCobrancaAvulsa em lib/faturamento/cobranca.ts).
  billingType: Exclude<BillingType, 'pix_avulso'>
  dueDate?: string // ISO date
  description?: string
  // Alguns gateways (ex: Mercado Pago em cobrança PIX avulsa) exigem o payer
  // embutido em cada pagamento em vez de referenciar só um customer salvo —
  // opcionais aqui pra não obrigar os demais adapters a usarem.
  payerName?: string
  payerDocument?: string
  payerEmail?: string
}

export type GatewayChargeResult = {
  id: string
  status: ChargeStatus
  pixQrCode?: string
  pixPayload?: string
  boletoUrl?: string
  paymentLink?: string
}
