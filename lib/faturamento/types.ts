// Módulo Faturamento — tipos compartilhados.
// Cobrança e nota fiscal que o TENANT emite para os próprios clientes finais,
// usando o gateway de pagamento e o CNPJ/CPF do próprio tenant.

export type GatewayProvider = 'asaas' | 'stripe' | 'pagarme' | 'mercadopago'

export type BillingType = 'pix' | 'boleto' | 'cartao'

export type ChargeStatus = 'pendente' | 'confirmada' | 'recebida' | 'vencida' | 'cancelada'

export type InvoiceStatus = 'rascunho' | 'processando' | 'autorizada' | 'rejeitada' | 'cancelada'

export type RegimeTributario = 'mei' | 'simples' | 'normal'

export type Ambiente = 'homologacao' | 'producao'

export type CredenciamentoStatus = 'pendente' | 'habilitado' | 'erro'

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
  created_at: string
  updated_at: string
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
  billingType: BillingType
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
