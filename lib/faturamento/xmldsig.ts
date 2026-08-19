// Helper genérico de assinatura XMLDSig (enveloped signature), compartilhado
// entre NFS-e (assina infDPS, filho de DPS) e NF-e/NFC-e (assina infNFe,
// filho de NFe) — mesmo mecanismo/algoritmos nos dois casos, só muda qual
// elemento é referenciado e onde a assinatura é anexada.
import { SignedXml } from 'xml-crypto'

export type AssinarXmlParams = {
  xml: string
  elementoAssinado: string // local-name do elemento referenciado pela assinatura, ex: 'infDPS' ou 'infNFe'
  elementoId: string // valor do atributo Id desse elemento
  elementoPai: string // local-name do elemento raiz onde a <Signature> é anexada, ex: 'DPS' ou 'NFe'
  chavePem: string
  certPem: string
}

export function assinarXml(params: AssinarXmlParams): string {
  const sig = new SignedXml({
    privateKey: params.chavePem,
    publicCert: params.certPem,
    signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#',
  })

  sig.addReference({
    xpath: `//*[local-name(.)='${params.elementoAssinado}']`,
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/2001/10/xml-exc-c14n#',
    ],
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
    uri: `#${params.elementoId}`,
  })

  sig.computeSignature(params.xml, {
    location: { reference: `//*[local-name(.)='${params.elementoPai}']`, action: 'append' },
  })

  return sig.getSignedXml()
}
