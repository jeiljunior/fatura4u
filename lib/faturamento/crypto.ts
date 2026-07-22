// Cifra/decifra credenciais sensíveis do módulo Faturamento (chave de API do
// gateway do tenant, token de webhook) antes de gravar no Postgres.
// AES-256-GCM com o crypto nativo do Node — sem dependência nova.
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const raw = process.env.FATURAMENTO_ENCRYPTION_KEY
  if (!raw) throw new Error('FATURAMENTO_ENCRYPTION_KEY não configurada')
  const key = Buffer.from(raw, 'base64')
  if (key.length !== 32) throw new Error('FATURAMENTO_ENCRYPTION_KEY inválida — precisa ser 32 bytes em base64')
  return key
}

// Formato armazenado: "<iv base64>:<authTag base64>:<ciphertext base64>"
export function encryptJSON(data: unknown): string {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const plaintext = Buffer.from(JSON.stringify(data), 'utf8')
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`
}

export function decryptJSON<T = unknown>(payload: string): T {
  const key = getKey()
  const [ivB64, authTagB64, ciphertextB64] = payload.split(':')
  if (!ivB64 || !authTagB64 || !ciphertextB64) throw new Error('Payload cifrado malformado')
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const ciphertext = Buffer.from(ciphertextB64, 'base64')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return JSON.parse(plaintext.toString('utf8')) as T
}
