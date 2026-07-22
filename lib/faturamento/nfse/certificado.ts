// Valida e extrai informações de um certificado digital A1 (.pfx/.p12) do
// tenant — usado pra mTLS e assinatura XMLDSig da DPS.
import forge from 'node-forge'

export type CertificadoInfo = {
  validoAte: Date
  cnpj: string | null
  commonName: string | null
}

// Lança erro se a senha estiver errada ou o arquivo não for um PKCS12 válido.
export function parseCertificado(pfxBuffer: Buffer, senha: string): CertificadoInfo {
  let p12Asn1: forge.asn1.Asn1
  try {
    p12Asn1 = forge.asn1.fromDer(forge.util.createBuffer(pfxBuffer.toString('binary')))
  } catch {
    throw new Error('Arquivo de certificado inválido (esperado .pfx/.p12)')
  }

  let p12: forge.pkcs12.Pkcs12Pfx
  try {
    p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, senha)
  } catch {
    throw new Error('Senha do certificado incorreta ou arquivo corrompido')
  }

  const bags = p12.getBags({ bagType: forge.pki.oids.certBag })
  const certBag = bags[forge.pki.oids.certBag]?.[0]
  if (!certBag?.cert) throw new Error('Nenhum certificado encontrado no arquivo')

  const cert = certBag.cert
  const commonName = cert.subject.getField('CN')?.value ?? null
  // Padrão ICP-Brasil e-CNPJ: CN costuma trazer "RAZAO SOCIAL:14DIGITOSCNPJ"
  const cnpjMatch = commonName?.match(/(\d{14})/)

  return {
    validoAte: cert.validity.notAfter,
    cnpj: cnpjMatch ? cnpjMatch[1] : null,
    commonName,
  }
}

// Extrai chave privada (PEM) e certificado (PEM) de dentro do .pfx — necessário
// pra assinatura XMLDSig da DPS.
export function extrairChaveECertificado(pfxBuffer: Buffer, senha: string): { chavePem: string; certPem: string } {
  const p12Asn1 = forge.asn1.fromDer(forge.util.createBuffer(pfxBuffer.toString('binary')))
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, senha)

  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
  const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]
  if (!keyBag?.key) throw new Error('Chave privada não encontrada no certificado')

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })
  const certBag = certBags[forge.pki.oids.certBag]?.[0]
  if (!certBag?.cert) throw new Error('Certificado não encontrado no arquivo')

  return {
    chavePem: forge.pki.privateKeyToPem(keyBag.key),
    certPem: forge.pki.certificateToPem(certBag.cert),
  }
}
