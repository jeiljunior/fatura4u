// Assina a DPS em XMLDSig (enveloped signature), exigido pela NFS-e Nacional
// além do mTLS na conexão. Assinatura vai como filho de <DPS>, irmão de
// <infDPS> (conforme o XSD oficial: DPS = infDPS + ds:Signature opcional).
// Mecanismo genérico vive em lib/faturamento/xmldsig.ts, reusado também
// pelo módulo nfe/ (NF-e/NFC-e assina infNFe em vez de infDPS).
import { assinarXml } from '../xmldsig'

export function assinarDpsXml(xml: string, infDpsId: string, chavePem: string, certPem: string): string {
  return assinarXml({
    xml,
    elementoAssinado: 'infDPS',
    elementoId: infDpsId,
    elementoPai: 'DPS',
    chavePem,
    certPem,
  })
}
