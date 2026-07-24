'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import HeroParticles from '@/components/HeroParticles'

const BG_COSMIC = '#03071C'
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

  useEffect(() => {
    const supabase = createClient()

    // O createBrowserClient do @supabase/ssr força flowType "pkce", que só
    // reconhece sessão vinda de "?code=" na URL — mas o link de e-mail de
    // recuperação de senha do Supabase (template padrão) usa o formato antigo,
    // com os tokens no FRAGMENTO da URL (#access_token=...&type=recovery). O
    // detectSessionInUrl automático nunca disparava por causa disso (bug real
    // encontrado testando o fluxo de ponta a ponta). Por isso extraímos os
    // tokens do hash na mão e chamamos setSession() direto.
    //
    // Só isso não bastou: o link continua passando pelo endpoint de uso único
    // /auth/v1/verify antes de chegar aqui — se algo "visitar" esse link antes
    // do clique de verdade do usuário (scanner de segurança de e-mail, Safe
    // Browsing etc.), o token já é consumido e o clique real cai em
    // "link inválido" mesmo sem o usuário ter feito nada de errado. Por isso
    // também aceitamos o formato ?token_hash=...&type=recovery na query string
    // — link customizado no template de e-mail do Supabase, que aponta direto
    // pra essa página em vez de passar pelo /verify de uso único, e a
    // verificação é feita aqui via verifyOtp() no primeiro (e único) acesso
    // real do usuário.
    async function tentarSessao() {
      const search = new URLSearchParams(window.location.search)
      const tokenHash = search.get('token_hash')
      if (tokenHash && search.get('type') === 'recovery') {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
        if (!error) {
          window.history.replaceState(null, '', window.location.pathname)
          return true
        }
      }

      const hash = new URLSearchParams(window.location.hash.slice(1))
      if (hash.get('type') !== 'recovery') return false

      const access_token = hash.get('access_token')
      const refresh_token = hash.get('refresh_token')
      if (!access_token || !refresh_token) return false

      const { error } = await supabase.auth.setSession({ access_token, refresh_token })
      if (error) return false

      // Limpa a URL pra não deixar o token exposto no histórico do navegador
      window.history.replaceState(null, '', window.location.pathname)
      return true
    }

    tentarSessao().then(ok => { if (ok) setReady(true) })

    // Mantido como reforço — cobre o caso de a Supabase um dia passar a usar
    // o fluxo PKCE de verdade (?code=), que o client já sabe processar sozinho.
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
        <img src="/brand/logo-horizontal-white.png" alt="FATUR4U" style={{ width: 121, maxWidth: '100%', height: 'auto', marginBottom: 24, display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />

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
