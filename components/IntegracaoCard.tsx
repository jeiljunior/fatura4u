'use client'
import { useCallback, useState } from 'react'

export type Chave = { id: string; name: string; active: boolean; last_used_at: string | null; created_at: string }

const dia = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : 'nunca')

// Chaves de integração: outros sistemas (ex.: SIGN4U) enviam pagamentos confirmados por API e a nota fica "a emitir" na tela Notas Fiscais.
export default function IntegracaoCard({ initial }: { initial: Chave[] }) {
  const [chaves, setChaves] = useState<Chave[]>(initial)
  const [nome, setNome] = useState('')
  const [nova, setNova] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const carregar = useCallback(async () => {
    const res = await fetch('/api/faturamento/integracao/tokens')
    const data = await res.json().catch(() => ({}))
    if (res.ok) setChaves(data.tokens ?? [])
  }, [])

  async function criar() {
    setSalvando(true); setErro(''); setNova(null); setCopiado(false)
    const res = await fetch('/api/faturamento/integracao/tokens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: nome }) })
    const data = await res.json().catch(() => ({}))
    setSalvando(false)
    if (!res.ok) { setErro(data.error ?? 'Não foi possível criar a chave'); return }
    setNome(''); setNova(data.chave); void carregar()
  }

  async function revogar(id: string) {
    if (!window.confirm('Revogar esta chave? O sistema que a usa deixa de enviar notas.')) return
    await fetch('/api/faturamento/integracao/tokens', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    void carregar()
  }

  const ativas = chaves.filter(c => c.active)

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
      <div>
        <h2 className="font-bold text-slate-900">Integração por API</h2>
        <p className="text-sm text-slate-500 mt-1">
          Seu sistema (loja, ERP, assinatura...) envia cada pagamento confirmado e o cliente e a nota entram aqui como <b>A emitir</b>. Você confere e clica em Emitir.
          Endereço: <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">POST https://fatura4u.com.br/api/integracoes/pagamentos</code> com o cabeçalho <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">Authorization: Bearer &lt;chave&gt;</code>.
        </p>
      </div>

      {nova && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="font-semibold text-amber-800">Copie a chave agora: ela não aparece de novo.</p>
          <p className="mt-2 break-all font-mono text-xs bg-white border border-amber-200 rounded-lg px-2 py-2">{nova}</p>
          <button onClick={() => { void navigator.clipboard.writeText(nova); setCopiado(true) }} className="mt-2 text-sm font-semibold text-amber-800 hover:underline">
            {copiado ? 'Copiada!' : 'Copiar chave'}
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input value={nome} onChange={e => setNome(e.target.value)} maxLength={60} placeholder="Nome da chave (ex.: SIGN4U)"
          className="flex-1 min-w-[12rem] border border-slate-200 rounded-xl px-3 py-2 text-sm" />
        <button onClick={criar} disabled={salvando || !nome.trim()}
          className="bg-[var(--brand-primary)] hover:brightness-110 text-white font-semibold text-sm px-4 py-2 rounded-xl transition disabled:opacity-50">
          {salvando ? 'Criando...' : 'Gerar chave'}
        </button>
      </div>
      {erro && <p className="text-red-500 text-sm">{erro}</p>}

      {ativas.length > 0 && (
        <ul className="divide-y divide-slate-100 text-sm">
          {ativas.map(c => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-2">
              <div>
                <p className="font-medium text-slate-800">{c.name}</p>
                <p className="text-xs text-slate-400">Criada em {dia(c.created_at)} · último uso: {dia(c.last_used_at)}</p>
              </div>
              <button onClick={() => revogar(c.id)} className="text-red-500 hover:underline text-xs">Revogar</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
