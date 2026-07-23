'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import HeroParticles from '@/components/HeroParticles'

const BG_COSMIC = '#03071C'
const PRIMARY = '#0099FF'
const SECONDARY = '#00D9FF'
const TEXT_SECONDARY = '#B0D4FF'
const CARD_BG = 'rgba(255,255,255,0.08)'

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })
    setLoading(false)
    // Não revela se o e-mail existe ou não — mesma mensagem nos dois casos,
    // pra evitar que alguém use isso pra descobrir e-mails cadastrados.
    if (error) { setError('Não foi possível enviar o e-mail agora. Tente novamente em instantes.'); return }
    setSent(true)
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
        <img src="/brand/logo-horizontal-white.png" alt="FATUR4U" style={{ height: 28, width: 'auto', marginBottom: 24, display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />

        {sent ? (
          <>
            <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 8px', textAlign: 'center' }}>
              Verifique seu e-mail
            </h2>
            <p style={{ color: TEXT_SECONDARY, fontSize: 14, textAlign: 'center', lineHeight: 1.6, margin: 0 }}>
              Se houver uma conta com o e-mail <strong style={{ color: '#fff' }}>{email}</strong>, enviamos um link
              pra redefinir sua senha. Confira também a caixa de spam.
            </p>
            <a href="/login" style={{
              display: 'block', textAlign: 'center', color: SECONDARY, fontSize: 13, fontWeight: 600,
              textDecoration: 'none', marginTop: 24,
            }}>
              ← Voltar para o login
            </a>
          </>
        ) : (
          <>
            <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 4px', textAlign: 'center' }}>
              Esqueceu sua senha?
            </h2>
            <p style={{ color: TEXT_SECONDARY, fontSize: 14, margin: '0 0 24px', textAlign: 'center' }}>
              Digite seu e-mail e enviaremos um link pra redefinir.
            </p>

            <form onSubmit={handleSubmit}>
              <label style={{ display: 'block', color: TEXT_SECONDARY, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                E-mail
              </label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="Digite seu e-mail"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.05)', border: `1px solid ${SECONDARY}4d`,
                  borderRadius: 8, padding: '12px 16px', fontSize: 14, color: '#fff', outline: 'none',
                }}
              />

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
                {loading ? 'Enviando...' : 'Enviar link de redefinição'}
              </button>
            </form>

            <a href="/login" style={{
              display: 'block', textAlign: 'center', color: SECONDARY, fontSize: 13, fontWeight: 600,
              textDecoration: 'none', marginTop: 20,
            }}>
              ← Voltar para o login
            </a>
          </>
        )}
      </div>
    </div>
  )
}
