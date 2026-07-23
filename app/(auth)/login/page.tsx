'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import HeroParticles from '@/components/HeroParticles'

const BG_COSMIC = '#03071C'
const PRIMARY = '#0099FF'
const SECONDARY = '#00D9FF'
const TEXT_SECONDARY = '#B0D4FF'
const CARD_BG = 'rgba(255,255,255,0.08)'

const benefits = [
  { label: 'Emissão de NFS-e', icon: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={SECONDARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>
    </svg>
  ) },
  { label: 'PIX, boleto e cartão', icon: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={SECONDARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  ) },
  { label: 'Certificado protegido', icon: (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={SECONDARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/>
    </svg>
  ) },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('E-mail ou senha incorretos.'); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: BG_COSMIC }}>

      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        padding: '16px 32px',
      }}>
        <a href="/cadastro" style={{
          background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)',
          color: '#fff', fontSize: 14, fontWeight: 700,
          border: `1px solid ${SECONDARY}55`,
          padding: '8px 20px', borderRadius: 999, textDecoration: 'none',
          display: 'inline-block',
        }}>
          Criar conta
        </a>
      </header>

      <div className="login-shell" style={{
        display: 'flex', flex: 1, minHeight: '100vh', position: 'relative', overflow: 'hidden',
        background: BG_COSMIC,
      }}>
        <HeroParticles />

        <div className="login-value" style={{
          flex: '0 1 58%',
          position: 'relative', zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 4vw 60px 6vw',
        }}>
          <div style={{ maxWidth: 720, width: '100%' }}>
            <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-1.5px', color: '#fff', marginBottom: 32 }}>
              FATUR<span style={{ color: SECONDARY }}>4U</span>
            </div>

            <p style={{
              color: SECONDARY, fontSize: 13, fontWeight: 700, letterSpacing: '2px',
              textTransform: 'uppercase', margin: '0 0 16px',
            }}>
              Nota fiscal e cobrança
            </p>

            <h1 style={{ color: '#fff', fontSize: 54, fontWeight: 700, lineHeight: 1.15, margin: '0 0 20px', letterSpacing: '-1px' }}>
              Emita nota e cobre.<br/>Sem <span style={{ color: SECONDARY }}>complicação.</span>
            </h1>

            <p style={{ color: TEXT_SECONDARY, fontSize: 17, lineHeight: 1.6, margin: '0 0 40px', maxWidth: 520 }}>
              Emissão de NFS-e Nacional e cobrança PIX, boleto e cartão em um único painel.
            </p>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {benefits.map(b => (
                <div key={b.label} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${SECONDARY}33`,
                  borderRadius: 8, padding: 16,
                  flex: '1 1 180px',
                }}>
                  {b.icon}
                  <span style={{ color: '#fff', fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="login-form-col" style={{
          flex: '0 1 42%', position: 'relative', zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 6vw 60px 4vw',
          minHeight: '100vh',
        }}>
          <div style={{
            width: '100%', maxWidth: 560,
            background: CARD_BG,
            border: `1px solid ${SECONDARY}40`,
            borderRadius: 24,
            boxShadow: `0 8px 40px rgba(0,153,255,0.15)`,
            backdropFilter: 'blur(16px)',
            padding: '48px 44px',
          }}>

            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <h2 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>
                Bem-vindo de volta
              </h2>
              <p style={{ color: TEXT_SECONDARY, fontSize: 14, margin: 0 }}>
                Acesse sua conta para continuar
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', color: TEXT_SECONDARY, fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  E-mail
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: TEXT_SECONDARY, display: 'flex' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/>
                    </svg>
                  </span>
                  <input
                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="Digite seu e-mail"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.05)', border: `1px solid ${SECONDARY}4d`,
                      borderRadius: 8, padding: '12px 16px 12px 42px', fontSize: 14, color: '#fff', outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ display: 'block', color: TEXT_SECONDARY, fontSize: 13, fontWeight: 500 }}>
                    Senha
                  </label>
                  <a href="/esqueci-senha" style={{ color: SECONDARY, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                    Esqueci minha senha
                  </a>
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: TEXT_SECONDARY, display: 'flex' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: 'rgba(255,255,255,0.05)', border: `1px solid ${SECONDARY}4d`,
                      borderRadius: 8, padding: '12px 48px 12px 42px', fontSize: 14, color: '#fff', outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                      color: TEXT_SECONDARY, display: 'flex', alignItems: 'center',
                    }}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{
                  background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 12, padding: '12px 16px', marginBottom: 16, marginTop: 12,
                }}>
                  <p style={{ color: '#fca5a5', fontSize: 13, margin: 0 }}>{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary-glow" style={{
                width: '100%', marginTop: 8,
                background: PRIMARY,
                border: 'none',
                color: '#fff', fontWeight: 600, fontSize: 15, padding: '14px',
                borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'filter 200ms ease-in-out',
              }}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <p style={{ color: TEXT_SECONDARY, fontSize: 13, margin: '24px 0 0', textAlign: 'center' }}>
              Ainda não tem uma conta?{' '}
              <a href="/cadastro" style={{ color: SECONDARY, fontWeight: 600, textDecoration: 'none' }}>
                Criar conta grátis
              </a>
            </p>

          </div>
        </div>
      </div>

      <style>{`
        input::placeholder { color: rgba(176,212,255,0.4); }
        a:hover { text-decoration: underline; }
        .btn-primary-glow:hover:not(:disabled) { filter: brightness(1.15); }
        input:focus { border-color: ${SECONDARY} !important; box-shadow: 0 0 0 3px rgba(0,217,255,0.15); }

        @media (max-width: 1199px) {
          .login-value { flex: 0 0 55% !important; padding: 60px 40px !important; }
          .login-form-col { flex: 0 0 45% !important; }
        }
        @media (max-width: 767px) {
          .login-shell { flex-direction: column !important; }
          .login-value { flex: none !important; padding: 100px 24px 24px !important; }
          .login-form-col { flex: none !important; padding: 24px !important; min-height: auto !important; }
        }
      `}</style>
    </div>
  )
}
