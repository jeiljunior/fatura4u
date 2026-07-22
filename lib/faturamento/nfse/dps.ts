// Monta o XML da DPS (Declaração de Prestação de Serviço) da NFS-e Nacional.
// Estrutura confirmada contra o XSD oficial (nfse_dps_v01.xsd): grupos
// infDPS/prest/toma/serv/valores. ALERTA: os códigos cTribNac (nacional de
// serviço) e cNBS (Nomenclatura Brasileira de Serviços), e os valores exatos
// de opSimpNac/regEspTrib por regime tributário, dependem de orientação de
// contador — os defaults aqui são um ponto de partida pra testar em
// homologação, não uma verdade fiscal fechada.
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type DpsInput = {
  ambiente: 'homologacao' | 'producao'
  serie: string
  numeroDps: string
  dataCompetencia: string // YYYY-MM-DD
  municipioIbge: string
  prestador: {
    documento: string
    tipoDocumento: 'cnpj' | 'cpf'
    razaoSocial: string
    inscricaoMunicipal?: string | null
    regime: 'mei' | 'simples' | 'normal'
  }
  tomador?: {
    documento: string
    tipoDocumento: 'cnpj' | 'cpf'
    nome: string
    email?: string | null
  }
  servico: {
    codigoTribNac: string
    codigoNbs: string
    descricao: string
  }
  valores: {
    valorServico: number
    aliquotaIss: number
  }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// IM de Curitiba costuma vir formatada com um dígito verificador após hífen
// (ex: "10 09 919.849-3") que NÃO faz parte do número real da inscrição —
// confirmado por relato de terceiro com o mesmo erro E0116 pro mesmo
// município: https://suporte.nuvemfiscal.com.br/t/emissao-de-nfse-nacional-para-curitiba-erro-codigo-e0116/4324
// Descarta tudo a partir do hífen, mantém só os dígitos antes dele.
function formatarIM(im: string): string {
  return im.split('-')[0].replace(/\D/g, '')
}

// opSimpNac: 1=Não optante, 2=Optante MEI, 3=Optante Simples (exceto MEI) — conferir com contador
const REGIME_TO_OPSIMPNAC: Record<DpsInput['prestador']['regime'], { opSimpNac: number; regEspTrib: number }> = {
  mei: { opSimpNac: 2, regEspTrib: 0 },
  simples: { opSimpNac: 3, regEspTrib: 0 },
  normal: { opSimpNac: 1, regEspTrib: 0 },
}

export function montarDpsXml(input: DpsInput): { xml: string; id: string } {
  const tpAmb = input.ambiente === 'producao' ? 1 : 2
  // TSDateTimeUTC: confirmado em teste real que rejeita milissegundos e "Z" —
  // a própria resposta de erro da Sefin usa horário de Brasília com offset
  // explícito "-03:00" (ex: "dataHoraProcessamento":"...-03:00"), não UTC/Z.
  // Brasil não tem mais horário de verão desde 2019, então -03:00 é fixo.
  // Subtrai uma margem extra (30s) além do offset de -03:00, pra absorver
  // qualquer diferença de relógio entre nossa máquina e o servidor da Sefin —
  // confirmado em teste real que "dhEmi no futuro" rejeita com E0008.
  const nowLocal = new Date(Date.now() - 3 * 60 * 60 * 1000 - 30 * 1000)
  const dhEmi = nowLocal.toISOString().replace(/\.\d{3}Z$/, '-03:00')
  const regime = REGIME_TO_OPSIMPNAC[input.prestador.regime]

  const serieFmt = input.serie.padStart(5, '0')
  const numeroFmt = input.numeroDps.padStart(15, '0')
  // Padrão TSIdDPS confirmado em teste real: DPS + cMun(7) + tpInsc(1: 1=CPF,2=CNPJ)
  // + CNPJ/CPF(14, zero-padded à esquerda) + serie(5) + nDPS(15) = "DPS" + 42 dígitos.
  const tpInsc = input.prestador.tipoDocumento === 'cnpj' ? '2' : '1'
  const inscFmt = input.prestador.documento.padStart(14, '0')
  const id = `DPS${input.municipioIbge}${tpInsc}${inscFmt}${serieFmt}${numeroFmt}`

  const prestDocTag = input.prestador.tipoDocumento === 'cnpj' ? 'CNPJ' : 'CPF'

  const tomaBlock = input.tomador
    ? (() => {
        const tomaDocTag = input.tomador!.tipoDocumento === 'cnpj' ? 'CNPJ' : 'CPF'
        return `
    <toma>
      <${tomaDocTag}>${esc(input.tomador!.documento)}</${tomaDocTag}>
      <xNome>${esc(input.tomador!.nome)}</xNome>${input.tomador!.email ? `\n      <email>${esc(input.tomador!.email)}</email>` : ''}
    </toma>`
      })()
    : ''

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.01">
  <infDPS Id="${id}">
    <tpAmb>${tpAmb}</tpAmb>
    <dhEmi>${dhEmi}</dhEmi>
    <verAplic>FATURA4U-1.0</verAplic>
    <serie>${esc(input.serie)}</serie>
    <nDPS>${esc(input.numeroDps)}</nDPS>
    <dCompet>${input.dataCompetencia}</dCompet>
    <tpEmit>1</tpEmit>
    <cLocEmi>${input.municipioIbge}</cLocEmi>
    <prest>
      <${prestDocTag}>${esc(input.prestador.documento)}</${prestDocTag}>${input.prestador.inscricaoMunicipal ? `\n      <IM>${esc(formatarIM(input.prestador.inscricaoMunicipal))}</IM>` : ''}
      <xNome>${esc(input.prestador.razaoSocial)}</xNome>
      <regTrib>
        <opSimpNac>${regime.opSimpNac}</opSimpNac>
        <regEspTrib>${regime.regEspTrib}</regEspTrib>
      </regTrib>
    </prest>${tomaBlock}
    <serv>
      <locPrest>
        <cLocPrestacao>${input.municipioIbge}</cLocPrestacao>
      </locPrest>
      <cServ>
        <cTribNac>${esc(input.servico.codigoTribNac)}</cTribNac>
        <xDescServ>${esc(input.servico.descricao)}</xDescServ>
        <cNBS>${esc(input.servico.codigoNbs)}</cNBS>
      </cServ>
    </serv>
    <valores>
      <vServPrest>
        <vServ>${input.valores.valorServico.toFixed(2)}</vServ>
      </vServPrest>
      <trib>
        <tribMun>
          <tribISSQN>1</tribISSQN>${input.prestador.regime === 'normal' ? `
          <pAliq>${input.valores.aliquotaIss.toFixed(2)}</pAliq>` : ''}
          <tpRetISSQN>1</tpRetISSQN>
        </tribMun>
        <totTrib>
          <indTotTrib>0</indTotTrib>
        </totTrib>
      </trib>
    </valores>
  </infDPS>
</DPS>`

  return { xml, id }
}

// Incrementa e devolve o próximo número sequencial, atômico via a função
// Postgres `proximo_numero_dps` (upsert + increment numa única instrução).
export async function proximoNumeroDps(businessId: string, serie: string): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc('proximo_numero_dps', {
    p_business_id: businessId,
    p_serie: serie,
  })
  if (error) throw error
  return String(data)
}
