// Assina a NF-e/NFC-e em XMLDSig — mesmo mecanismo da NFS-e (ver
// lib/faturamento/xmldsig.ts), mas assina infNFe (filho de NFe) em vez de
// infDPS (filho de DPS). O Id assinado é a própria chave de acesso
// (Id="NFe<44 dígitos>"), calculada em chave-acesso.ts antes de chegar aqui.
import { assinarXml } from '../xmldsig'

export function assinarNfeXml(xml: string, infNFeId: string, chavePem: string, certPem: string): string {
  return assinarXml({
    xml,
    elementoAssinado: 'infNFe',
    elementoId: infNFeId,
    elementoPai: 'NFe',
    chavePem,
    certPem,
  })
}
