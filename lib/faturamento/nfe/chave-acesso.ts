// Chave de acesso da NF-e/NFC-e (44 dígitos) — diferente da NFS-e Nacional
// (que devolve a chave pronta na resposta), aqui é o EMISSOR que calcula
// antes de montar o XML: a assinatura cobre o atributo Id="NFe<chave>" do
// infNFe, então a chave tem que estar certa antes de assinar.
//
// Composição (43 dígitos + 1 dígito verificador mod-11):
//   cUF(2) + AAMM(4) + CNPJ(14) + mod(2) + serie(3) + nNF(9) + tpEmis(1) + cNF(8) + DV(1)

// Código da UF conforme tabela do IBGE, usado pela SEFAZ em toda a família
// de documentos fiscais eletrônicos (NF-e, CT-e, MDF-e...). Só as UFs do
// rollout (PR primeiro, depois SC/SP/RS/RJ) estão mapeadas — adicionar aqui
// ao habilitar uma UF nova.
const CODIGO_UF: Record<string, string> = {
  PR: '41',
  SC: '42',
  SP: '35',
  RS: '43',
  RJ: '33',
}

export type ChaveAcessoInput = {
  uf: string // sigla, ex: 'PR'
  aamm: string // AAMM da emissão, 4 dígitos (ex: '2608')
  cnpj: string // 14 dígitos, só números
  modelo: '55' | '65'
  serie: string | number
  numero: string | number
  tpEmis?: string // 1 = emissão normal; contingência fica pra fase futura
  codigoNumerico?: string // cNF, 8 dígitos — gerado aleatório se omitido
}

export type ChaveAcessoResult = {
  chave: string // 44 dígitos, com DV
  chaveSemDv: string // 43 dígitos, sem DV — útil pra depuração
  digitoVerificador: string
  codigoNumerico: string
}

function pad(value: string | number, length: number): string {
  return String(value).replace(/\D/g, '').padStart(length, '0').slice(-length)
}

function gerarCodigoNumerico(): string {
  // cNF é livre-escolha do emissor, só precisa ter 8 dígitos — usado pra
  // "embaralhar" a chave e dificultar previsão do próximo número de nota.
  return String(Math.floor(Math.random() * 1e8)).padStart(8, '0')
}

// Módulo 11 com pesos 2-9 cíclicos, aplicado da direita pra esquerda —
// mesmo algoritmo usado em toda a família de DF-e (NF-e/CT-e/MDF-e/BP-e).
function calcularDvMod11(digitos: string): string {
  let soma = 0
  let peso = 2
  for (let i = digitos.length - 1; i >= 0; i--) {
    soma += Number(digitos[i]) * peso
    peso = peso === 9 ? 2 : peso + 1
  }
  const resto = soma % 11
  return resto < 2 ? '0' : String(11 - resto)
}

export function montarChaveAcesso(input: ChaveAcessoInput): ChaveAcessoResult {
  const cUF = CODIGO_UF[input.uf.toUpperCase()]
  if (!cUF) throw new Error(`UF "${input.uf}" não mapeada em CODIGO_UF — adicionar antes de habilitar essa UF`)

  const codigoNumerico = input.codigoNumerico ?? gerarCodigoNumerico()

  const chaveSemDv =
    cUF +
    pad(input.aamm, 4) +
    pad(input.cnpj, 14) +
    input.modelo +
    pad(input.serie, 3) +
    pad(input.numero, 9) +
    (input.tpEmis ?? '1') +
    pad(codigoNumerico, 8)

  if (chaveSemDv.length !== 43) {
    throw new Error(`Chave de acesso montada com tamanho errado (${chaveSemDv.length}, esperado 43) — confira os campos de entrada`)
  }

  const digitoVerificador = calcularDvMod11(chaveSemDv)

  return {
    chave: chaveSemDv + digitoVerificador,
    chaveSemDv,
    digitoVerificador,
    codigoNumerico,
  }
}
