'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { maskPhone, maskDocument, maskBirthDate } from '@/lib/masks'
import HeroParticles from '@/components/HeroParticles'

const BG_COSMIC = '#030A25'
const PRIMARY = '#0099FF'
const SECONDARY = '#00D9FF'
const TEXT_SECONDARY = '#B0D4FF'
const CARD_BG = 'rgba(255,255,255,0.08)'

type Step = 'tipo' | 'dados' | 'endereco'

export default function CadastroPage() {
  const router = useRouter()

  const [step, setStep] = useState<Step>('tipo')
  const [docType, setDocType] = useState<'cpf' | 'cnpj'>('cpf')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [fullName, setFullName] = useState('')
  const [razaoSocial, setRazaoSocial] = useState('')
  const [docNumber, setDocNumber] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')

  const [zip, setZip] = useState('')
  const [street, setStreet] = useState('')
  const [addrNumber, setAddrNumber] = useState('')
  const [complement, setComplement] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [city, setCity] = useState('')
  const [addrState, setAddrState] = useState('')
  const [loadingCep, setLoadingCep] = useState(false)
  const [loadingCnpj, setLoadingCnpj] = useState(false)

  const steps: Step[] = ['tipo', 'dados', 'endereco']
  const stepIndex = steps.indexOf(step)

  function goTo(s: Step) { setError(''); setStep(s) }

  async function fetchCep(cep: string) {
    const clean = cep.replace(/\D/g, '')
    if (clean.length !== 8) return
    setLoadingCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
      const d = await res.json()
      if (!d.erro) {
        setStreet(d.logradouro ?? '')
        setNeighborhood(d.bairro ?? '')
        setCity(d.localidade ?? '')
        setAddrState(d.uf ?? '')
      }
    } catch {}
    setLoadingCep(false)
  }

  async function fetchCnpj() {
    const clean = docNumber.replace(/\D/g, '')
    if (clean.length !== 14) { setError('CNPJ inválido'); return }
    setLoadingCnpj(true); setError('')
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`)
      if (!res.ok) throw new Error()
      const d = await res.json()
      setRazaoSocial(d.razao_social ?? '')
      setBusinessName(d.nome_fantasia || d.razao_social || '')
      setStreet(d.logradouro ?? '')
      setAddrNumber(d.numero ?? '')
      setComplement(d.complemento ?? '')
      setNeighborhood(d.bairro ?? '')
      setCity(d.municipio ?? '')
      setAddrState(d.uf ?? '')
      setZip((d.cep ?? '').replace(/\D/g, ''))
    } catch { setError('CNPJ não encontrado na Receita Federal') }
    setLoadingCnpj(false)
  }

  async function handleSubmit() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, password,
          fullName, razaoSocial, docType, docNumber,
          birthDate: (() => { const p = birthDate.split('/'); return p.length === 3 && p[2].length === 4 ? `${p[2]}-${p[1]}-${p[0]}` : birthDate })(),
          businessName, phone,
          zip, street, number: addrNumber, complement, neighborhood, city, state: addrState,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as { error?: string }).error ?? `Erro ao criar conta (status ${res.status})`)

      const supabase = createClient()
      await supabase.auth.signInWithPassword({ email, password })
      router.push('/dashboard')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao criar conta')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: BG_COSMIC, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', position: 'relative', overflow: 'hidden' }}>
      <HeroParticles />
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 520 }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-1.5px', color: '#fff' }}>
            FATURA<span style={{ color: SECONDARY }}>4U</span>
          </div>
          <p style={{ color: TEXT_SECONDARY, fontSize: 13, marginTop: 4 }}>Criar conta</p>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {steps.map((s, i) => (
            <div key={s} style={{ flex: 1, height: 3, borderRadius: 99, background: i <= stepIndex ? SECONDARY : 'rgba(255,255,255,0.15)', transition: 'background 0.3s' }} />
          ))}
        </div>

        <div style={{ background: CARD_BG, backdropFilter: 'blur(16px)', border: `1px solid ${SECONDARY}40`, borderRadius: 24, padding: 32 }}>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
              <p style={{ color: '#fca5a5', fontSize: 13, margin: 0 }}>{error}</p>
            </div>
          )}

          {/* TIPO */}
          {step === 'tipo' && (
            <>
              <h2 style={sh2}>Você é pessoa física ou jurídica?</h2>
              <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
                {(['cpf', 'cnpj'] as const).map(t => (
                  <button key={t} onClick={() => { setDocType(t); goTo('dados') }} style={{
                    flex: 1, padding: '20px 16px', borderRadius: 16,
                    border: `2px solid ${docType === t ? SECONDARY : 'rgba(255,255,255,0.2)'}`,
                    background: docType === t ? 'rgba(0,217,255,0.1)' : 'transparent',
                    color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{t === 'cpf' ? '👤' : '🏢'}</div>
                    {t === 'cpf' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2, color: TEXT_SECONDARY }}>{t === 'cpf' ? '(CPF)' : '(CNPJ)'}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => router.push('/')} style={btnSecondary}>← Voltar ao início</button>
            </>
          )}

          {/* DADOS */}
          {step === 'dados' && (
            <>
              <h2 style={sh2}>{docType === 'cpf' ? 'Dados pessoais' : 'Dados da empresa'}</h2>
              {docType === 'cnpj' && (
                <>
                  <label style={lbl}>CNPJ</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <input style={{ ...inp, flex: 1, marginBottom: 0 }} value={docNumber} placeholder="00.000.000/0001-00" maxLength={18} onChange={e => setDocNumber(maskDocument(e.target.value))} />
                    <button onClick={fetchCnpj} disabled={loadingCnpj} style={{ background: SECONDARY, color: BG_COSMIC, fontWeight: 700, fontSize: 13, padding: '0 14px', borderRadius: 10, border: 'none', cursor: 'pointer', opacity: loadingCnpj ? 0.6 : 1 }}>
                      {loadingCnpj ? '...' : '🔍 Buscar'}
                    </button>
                  </div>
                  <label style={lbl}>Razão Social</label>
                  <input style={inp} value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} />
                  <label style={lbl}>Nome Fantasia / Nome do negócio</label>
                  <input style={inp} value={businessName} onChange={e => setBusinessName(e.target.value)} />
                </>
              )}
              {docType === 'cpf' && (
                <>
                  <label style={lbl}>Nome completo</label>
                  <input style={inp} value={fullName} onChange={e => setFullName(e.target.value)} />
                  <label style={lbl}>CPF</label>
                  <input style={inp} value={docNumber} placeholder="000.000.000-00" maxLength={14} onChange={e => setDocNumber(maskDocument(e.target.value))} />
                  <label style={lbl}>Data de nascimento</label>
                  <input style={inp} value={birthDate} placeholder="DD/MM/AAAA" maxLength={10}
                    onChange={e => setBirthDate(maskBirthDate(e.target.value))} />
                </>
              )}
              <label style={lbl}>Telefone</label>
              <input style={inp} value={phone} placeholder="41 99999-9999" onChange={e => setPhone(maskPhone(e.target.value))} />
              <label style={lbl}>E-mail</label>
              <input style={inp} type="email" value={email} autoComplete="off" onChange={e => setEmail(e.target.value)} />
              <label style={lbl}>Senha</label>
              <input style={inp} type="password" value={password} placeholder="Mínimo 6 caracteres" autoComplete="new-password" onChange={e => setPassword(e.target.value)} />
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => goTo('tipo')} style={btnSecondary}>← Voltar</button>
                <button onClick={() => {
                  const nomeNegocio = docType === 'cpf' ? fullName : businessName
                  if (!nomeNegocio || !email || !password) { setError('Preencha todos os campos obrigatórios'); return }
                  if (password.length < 6) { setError('Senha mínima de 6 caracteres'); return }
                  if (docType === 'cpf') setBusinessName(fullName)
                  goTo('endereco')
                }} style={btnPrimary}>Continuar →</button>
              </div>
            </>
          )}

          {/* ENDEREÇO */}
          {step === 'endereco' && (
            <>
              <h2 style={sh2}>Endereço</h2>
              <label style={lbl}>CEP</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input style={{ ...inp, flex: 1, marginBottom: 0 }} value={zip} placeholder="00000-000"
                  onChange={e => { setZip(e.target.value); if (e.target.value.replace(/\D/g, '').length === 8) fetchCep(e.target.value) }} />
                {loadingCep && <span style={{ color: TEXT_SECONDARY, fontSize: 13, alignSelf: 'center' }}>...</span>}
              </div>
              <label style={lbl}>Rua / Logradouro</label>
              <input style={inp} value={street} onChange={e => setStreet(e.target.value)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={lbl}>Número</label><input style={inp} value={addrNumber} onChange={e => setAddrNumber(e.target.value)} /></div>
                <div><label style={lbl}>Complemento</label><input style={inp} value={complement} placeholder="Opcional" onChange={e => setComplement(e.target.value)} /></div>
              </div>
              <label style={lbl}>Bairro</label>
              <input style={inp} value={neighborhood} onChange={e => setNeighborhood(e.target.value)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12 }}>
                <div><label style={lbl}>Cidade</label><input style={inp} value={city} onChange={e => setCity(e.target.value)} /></div>
                <div><label style={lbl}>UF</label><input style={inp} value={addrState} maxLength={2} onChange={e => setAddrState(e.target.value.toUpperCase())} /></div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => goTo('dados')} style={btnSecondary}>← Voltar</button>
                <button onClick={handleSubmit} disabled={loading} style={{ ...btnCta, opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Criando conta...' : '🎉 Criar conta'}
                </button>
              </div>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', color: TEXT_SECONDARY, fontSize: 13, marginTop: 24 }}>
          Já tem conta?{' '}
          <a href="/login" style={{ color: SECONDARY, fontWeight: 700, textDecoration: 'none' }}>Entrar</a>
        </p>
      </div>
    </div>
  )
}

const sh2: React.CSSProperties = { color: '#fff', fontSize: 18, fontWeight: 800, margin: '0 0 20px' }
const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: TEXT_SECONDARY, marginBottom: 6 }
const inp: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.05)', border: `1px solid ${SECONDARY}4d`,
  borderRadius: 8, padding: '11px 14px', fontSize: 14, color: '#fff', outline: 'none', marginBottom: 16,
}
const btnPrimary: React.CSSProperties = { flex: 2, background: PRIMARY, color: '#fff', fontWeight: 700, fontSize: 15, padding: '13px', borderRadius: 8, border: 'none', cursor: 'pointer' }
const btnCta: React.CSSProperties = { flex: 2, background: SECONDARY, color: BG_COSMIC, fontWeight: 800, fontSize: 15, padding: '13px', borderRadius: 8, border: 'none', cursor: 'pointer' }
const btnSecondary: React.CSSProperties = { flex: 1, background: 'transparent', color: '#fff', fontWeight: 700, fontSize: 14, padding: '13px', borderRadius: 8, border: `1px solid ${SECONDARY}55`, cursor: 'pointer' }
