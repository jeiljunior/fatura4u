'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Modo = 'carregando' | 'ativar' | 'verificar'

export default function TwoFactorForm() {
  const router = useRouter()
  const [modo, setModo] = useState<Modo>('carregando')
  const [factorId, setFactorId] = useState('')
  const [qr, setQr] = useState('')
  const [secret, setSecret] = useState('')
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    let cancelado = false
    async function iniciar() {
      const supabase = createClient()
      const { data: fatores, error } = await supabase.auth.mfa.listFactors()
      if (cancelado) return
      if (error) { setErro(error.message); return }

      const verificado = fatores.totp[0]
      if (verificado) {
        setFactorId(verificado.id)
        setModo('verificar')
        return
      }

      // Tentativa de ativação anterior abandonada: remove pra poder começar de novo.
      for (const f of fatores.all.filter(f => f.factor_type === 'totp' && f.status !== 'verified')) {
        await supabase.auth.mfa.unenroll({ factorId: f.id })
      }

      const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'FATUR4U Admin' })
      if (cancelado) return
      if (enrollError || !data) { setErro(enrollError?.message ?? 'Não foi possível iniciar a ativação.'); return }
      setFactorId(data.id)
      setQr(data.totp.qr_code)
      setSecret(data.totp.secret)
      setModo('ativar')
    }
    iniciar()
    return () => { cancelado = true }
  }, [])

  async function confirmar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    const supabase = createClient()
    const { data: desafio, error: desafioError } = await supabase.auth.mfa.challenge({ factorId })
    if (desafioError || !desafio) {
      setErro(desafioError?.message ?? 'Não foi possível gerar o desafio.')
      setEnviando(false)
      return
    }
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: desafio.id, code: codigo.replace(/\s/g, '') })
    if (error) {
      setErro('Código inválido ou expirado. Confira o aplicativo e tente de novo.')
      setEnviando(false)
      return
    }
    router.replace('/admin')
    router.refresh()
  }

  if (modo === 'carregando') {
    return <p className="text-sm text-slate-400">{erro || 'Carregando...'}</p>
  }

  return (
    <form onSubmit={confirmar} className="space-y-4">
      {modo === 'ativar' && (
        <>
          <p className="text-sm text-slate-600">
            Primeiro acesso: escaneie o QR Code com um aplicativo autenticador (Google Authenticator, Microsoft
            Authenticator, Authy...) e digite o código de 6 dígitos que ele mostrar.
          </p>
          <img src={qr} alt="QR Code para o aplicativo autenticador" className="mx-auto h-44 w-44" />
          <p className="break-all text-center font-mono text-xs text-slate-500">
            Sem câmera? Digite esta chave no aplicativo: {secret}
          </p>
        </>
      )}
      <input
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={7}
        placeholder="Código de 6 dígitos"
        value={codigo}
        onChange={e => setCodigo(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-slate-500"
        autoFocus
      />
      {erro && <p className="text-sm text-red-500">{erro}</p>}
      <button
        type="submit"
        disabled={enviando || codigo.replace(/\s/g, '').length < 6}
        className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {enviando ? 'Verificando...' : modo === 'ativar' ? 'Ativar e entrar' : 'Entrar'}
      </button>
    </form>
  )
}
