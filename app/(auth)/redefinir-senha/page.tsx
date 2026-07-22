'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import HeroParticles from '@/components/HeroParticles'

const BG_COSMIC = '#030A25'
const PRIMARY = '#0099FF'
const SECONDARY = '#00D9FF'
const TEXT_SECONDARY = '#B0D4FF'
const CARD_BG = 'rgba(255,255,255,0.08)'

export default function RedefinirSenhaPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [linkInvalido, setLinkInvalido] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  // O link do e-mail traz um token na própria URL — o supabase-js já detecta
  // e estabelece a sessão de recuperação sozinho (detectSessionInUrl, ligado
  // por padrão no client de browser). Só precisamos esperar esse evento antes
  // de mostrar o formulário, e tratar o caso de link expirado/inválido.
  useEffect(() => {
    const supabase = createClient()

    // Importante: só o evento PASSWORD_RECOVERY confirma que a sessão veio de
    // um link de redefinição de verdade. Checar "existe uma sessão?" de forma
    // genérica é errado — se o usuário já estiver logado normalmente (sessão
    // comum, sem passar pelo link), isso deixaria trocar a senha sem nenhum
    // link válido, o que quebra a proteção desta tela.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })

    const timeout = setTimeout(() => {
      setReady(prevReady => {
        if (!prevReady) setLinkInvalido(true)
        return prevReady
      })
    }, 4000)

    return () => {
      listener.subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('A senha precisa ter pelo menos 6 caracteres.'); return }
    if (password !== confirm) { setError('As senhas não coincidem.'); return }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError('Não foi possível redefinir a senha. Tente pedir um novo link.'); return }
    setDone(true)
    setTimeout(() => router.push('/login'), 2500)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG_COSMIC, position: 'relative', overflow: 'hidden' }}>
      <HeroParticles />
      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 460, margin: '0 24px',
        background: CARD_BG,
        border: `1px solid ${SECONDARY}40`,
        borderRadius: 24,
        boxShadow: `0 8px 40px rgba(0,153,255,0.15)`,
        backdropFilter: 'blur(16px)',
        padding: '48px 44px',
      }}>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-1px', color: '#fff', marginBottom: 24, textAlign: 'center' }}>
          FATURA<span style={{ color: SECONDARY }}>4U</span>
        </div>

        {done ? (
          <>
            <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 8px', textAlign: 'center' }}>
              Senha redefinida!
            </h2>
            <p style={{ color: TEXT_SECONDARY, fontSize: 14, textAlign: 'center', margin: 0 }}>
              Levando você pro login...
            </p>
          </>
        ) : linkInvalido ? (
          <>
            <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 8px', textAlign: 'center' }}>
              Link inválido ou expirado
            </h2>
            <p style={{ color: TEXT_SECONDARY, fontSize: 14, textAlign: 'center', lineHeight: 1.6, margin: '0 0 20px' }}>
              Esse link de redefinição não é mais válido. Peça um novo.
            </p>
            <a href="/esqueci-senha" style={{
              display: 'block', textAlign: 'center', background: PRIMARY, color: '#fff',
              fontWeight: 600, fontSize: 15, padding: '14px', borderRadius: 8, textDecoration: 'none',
            }}>
              Pedir novo link
            </a>
          </>
        ) : !ready ? (
          <p style={{ color: TEXT_SECONDARY, fontSize: 14, textAlign: 'center' }}>Verificando link...</p>
        ) : (
          <>
            <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 4px', textAlign: 'center' }}>
              Defina sua nova senha
            </h2>
            <p style={{ color: TEXT_SECONDARY, fontSize: 14, margin: '0 0 24px', textAlign: 'center' }}>
              Mínimo de 6 caracteres.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', color: TEXT_SECONDARY, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  Nova senha
                </label>
                <input
                  type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.05)', border: `1px solid ${SECONDARY}4d`,
                    borderRadius: 8, padding: '12px 16px', fontSize: 14, color: '#fff', outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', color: TEXT_SECONDARY, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  Confirmar nova senha
                </label>
                <input
                  type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Repita a nova senha"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.05)', border: `1px solid ${SECONDARY}4d`,
                    borderRadius: 8, padding: '12px 16px', fontSize: 14, color: '#fff', outline: 'none',
                  }}
                />
              </div>

              {error && (
                <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '12px 16px', marginTop: 16 }}>
                  <p style={{ color: '#fca5a5', fontSize: 13, margin: 0 }}>{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading} style={{
                width: '100%', marginTop: 20,
                background: PRIMARY, border: 'none',
                color: '#fff', fontWeight: 600, fontSize: 15, padding: '14px',
                borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}>
                {loading ? 'Salvando...' : 'Redefinir senha'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
