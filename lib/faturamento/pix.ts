// Gera o código PIX "copia e cola" (BR Code / EMV QR Code estático) direto
// com a chave PIX do tenant — sem depender de nenhum gateway (Asaas,
// Mercado Pago etc). Formato definido pelo Banco Central no "Manual de
// Padrões para Iniciação do Pix". Qualquer banco/carteira sabe ler.

function tlv(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, '0')}${value}`
}

// CRC16/CCITT-FALSE (poly 0x1021, init 0xFFFF) — exigido no campo final do payload.
function crc16(payload: string): string {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

// Remove acentos e caracteres fora do padrão ASCII simples exigido pelo
// BR Code, e trunca no tamanho máximo do campo.
function normalizar(texto: string, max: number): string {
  const semAcento = texto.normalize('NFD').replace(/[̀-ͯ]/g, '')
  const soAscii = semAcento.replace(/[^a-zA-Z0-9 ]/g, '')
  return (soAscii.trim() || 'NAO INFORMADO').slice(0, max).toUpperCase()
}

export function gerarPixCopiaCola(params: {
  chave: string
  nomeRecebedor: string
  cidadeRecebedor: string
  valorCents?: number | null
  txid?: string
}): string {
  const merchantAccountInfo = tlv('00', 'br.gov.bcb.pix') + tlv('01', params.chave)
  const txid = (params.txid ?? '***').replace(/[^a-zA-Z0-9*]/g, '').slice(0, 25) || '***'
  const additionalData = tlv('05', txid)

  let payload = ''
  payload += tlv('00', '01') // Payload Format Indicator
  payload += tlv('26', merchantAccountInfo) // Merchant Account Info (PIX)
  payload += tlv('52', '0000') // Merchant Category Code
  payload += tlv('53', '986') // Moeda: Real (BRL)
  if (params.valorCents != null) payload += tlv('54', (params.valorCents / 100).toFixed(2))
  payload += tlv('58', 'BR') // País
  payload += tlv('59', normalizar(params.nomeRecebedor, 25)) // Nome do recebedor
  payload += tlv('60', normalizar(params.cidadeRecebedor, 15)) // Cidade do recebedor
  payload += tlv('62', additionalData) // Additional Data Field (txid)

  payload += '6304' // Tag + tamanho do CRC (valor calculado a seguir)
  return payload + crc16(payload)
}
