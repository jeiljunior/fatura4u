// Assina a DPS em XMLDSig (enveloped signature), exigido pela NFS-e Nacional
// além do mTLS na conexão. Assinatura vai como filho de <DPS>, irmão de
// <infDPS> (conforme o XSD oficial: DPS = infDPS + ds:Signature opcional).
import { SignedXml } from 'xml-crypto'

export function assinarDpsXml(xml: string, infDpsId: string, chavePem: string, certPem: string): string {
  const sig = new SignedXml({
    privateKey: chavePem,
    publicCert: certPem,
    signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
    canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#',
  })

  sig.addReference({
    xpath: "//*[local-name(.)='infDPS']",
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/2001/10/xml-exc-c14n#',
    ],
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
    uri: `#${infDpsId}`,
  })

  sig.computeSignature(xml, {
    location: { reference: "//*[local-name(.)='DPS']", action: 'append' },
  })

  return sig.getSignedXml()
}
