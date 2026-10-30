import { createHash, randomBytes } from 'crypto'

// Chave de integração: "f4u_" + 32 bytes aleatórios em base64url. No banco fica só o hash SHA-256.
export function novaChave(): { chave: string; hash: string } {
  const chave = `f4u_${randomBytes(32).toString('base64url')}`
  return { chave, hash: hashChave(chave) }
}

export const hashChave = (chave: string) => createHash('sha256').update(chave).digest('hex')

// "Authorization: Bearer <chave>" -> a chave (ou null)
export function chaveDoCabecalho(authorization: string | null): string | null {
  const m = /^Bearer\s+(f4u_[A-Za-z0-9_-]{20,100})$/.exec(authorization ?? '')
  return m ? m[1] : null
}
