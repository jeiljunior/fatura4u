'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ConfigPlanos, PlanoId, Recurso } from '@/lib/planosBase'
import { PLANOS_COM_LIMITES, precoAnual, precoMensalTexto } from '@/lib/planosBase'

const card = 'rounded-xl border border-zinc-200 bg-white p-5'
const campo = 'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900'
const botao = 'rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 hover:bg-zinc-50 disabled:opacity-50'
const botaoAzul = 'rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50'

function useAcao() {
  const router = useRouter()
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  async function enviar(corpo: Record<string, unknown>, ok: string) {
    setOcupado(true)
    setMsg(null)
    const res = await fetch('/api/admin/planos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })
    const data = await res.json().catch(() => ({}))
    setOcupado(false)
    if (!res.ok) { setMsg({ tipo: 'erro', texto: data.error ?? 'Não foi possível salvar' }); return false }
    setMsg({ tipo: 'ok', texto: ok })
    router.refresh()
    return true
  }
  const aviso = msg && <p className={`mt-2 text-xs ${msg.tipo === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>{msg.texto}</p>
  return { enviar, ocupado, aviso }
}

function BlocoLanding({ modo }: { modo: ConfigPlanos['landing_precos'] }) {
  const { enviar, ocupado, aviso } = useAcao()
  const finais = modo === 'finais'
  return (
    <div className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-zinc-900">Preços na landing</p>
          <p className="text-sm text-zinc-500">{finais ? 'Mostrados como finais' : 'Mostrados como “valores em definição”'}</p>
        </div>
        <button disabled={ocupado} className={botao}
          onClick={() => enviar({ acao: 'landing', modo: finais ? 'em_definicao' : 'finais' }, 'Modo da landing atualizado.')}>
          {finais ? 'Voltar para “valores em definição”' : 'Mostrar como valores finais'}
        </button>
      </div>
      <p className="mt-2 text-xs text-zinc-500">Controla só o texto da landing e da tela de planos. Não libera nem bloqueia a contratação: isso é o quadro abaixo.</p>
      {aviso}
    </div>
  )
}

function BlocoContratacao({ aberta }: { aberta: boolean }) {
  const { enviar, ocupado, aviso } = useAcao()
  const [confirmacao, setConfirmacao] = useState('')
  return (
    <div className={card}>
      <p className="font-medium text-zinc-900">Contratação de planos</p>
      <p className={`text-sm ${aberta ? 'text-emerald-700' : 'text-zinc-500'}`}>{aberta ? 'Aberta' : 'Fechada'}</p>
      <p className="mt-2 text-xs text-zinc-500">
        Fechada: o cliente vê os planos e os preços, mas o botão Contratar não funciona e ninguém é cobrado em produção. Antes de liberar, confira: nota fiscal da HTSIGNS, Termos revisados e entregabilidade dos e-mails.
      </p>
      {aberta ? (
        <button disabled={ocupado} className={`${botao} mt-3`} onClick={() => enviar({ acao: 'contratacao', aberta: false }, 'Contratação fechada.')}>Fechar a contratação</button>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input value={confirmacao} onChange={e => setConfirmacao(e.target.value)} placeholder="Digite LIBERAR VENDA para confirmar" className={`${campo} max-w-xs`} />
          <button disabled={ocupado || confirmacao !== 'LIBERAR VENDA'} className={botaoAzul}
            onClick={() => enviar({ acao: 'contratacao', aberta: true, confirmacao }, 'Contratação liberada.')}>Liberar a contratação</button>
        </div>
      )}
      {aviso}
    </div>
  )
}

function TextosCartao({ id, subtitulo: sub0, recursos: rec0 }: { id: PlanoId; subtitulo: string; recursos: Recurso[] }) {
  const { enviar, ocupado, aviso } = useAcao()
  const [subtitulo, setSubtitulo] = useState(sub0)
  const [recursos, setRecursos] = useState<Recurso[]>(rec0)

  const mover = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= recursos.length) return
    const novo = [...recursos]; [novo[i], novo[j]] = [novo[j], novo[i]]
    setRecursos(novo)
  }

  return (
    <details className="mt-4 rounded-lg border border-zinc-200 p-4">
      <summary className="cursor-pointer text-sm font-medium text-zinc-900">Textos do cartão na landing</summary>
      <label className="mb-1 mt-3 block text-xs text-zinc-500">Subtítulo do cartão</label>
      <input value={subtitulo} onChange={e => setSubtitulo(e.target.value)} maxLength={120} className={campo} />
      <p className="mb-1 mt-3 text-xs text-zinc-500">Lista de recursos (aparece com ✓ no cartão)</p>
      <ul className="space-y-2">
        {recursos.map((r, i) => (
          <li key={i} className="flex flex-wrap items-center gap-2">
            <input value={r.texto} maxLength={120} onChange={e => setRecursos(recursos.map((x, k) => k === i ? { ...x, texto: e.target.value } : x))} className={`${campo} flex-1`} />
            <label className="flex items-center gap-1 text-xs text-zinc-600">
              <input type="checkbox" checked={r.em_breve} onChange={e => setRecursos(recursos.map((x, k) => k === i ? { ...x, em_breve: e.target.checked } : x))} /> selo “em breve”
            </label>
            <button type="button" onClick={() => mover(i, -1)} aria-label="Subir" className="h-8 w-8 rounded-lg border border-zinc-200 text-sm text-zinc-900 hover:bg-zinc-50">↑</button>
            <button type="button" onClick={() => mover(i, 1)} aria-label="Descer" className="h-8 w-8 rounded-lg border border-zinc-200 text-sm text-zinc-900 hover:bg-zinc-50">↓</button>
            <button type="button" onClick={() => setRecursos(recursos.filter((_, k) => k !== i))} className="text-xs text-red-600 hover:underline">Remover</button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {recursos.length < 12 && <button type="button" className={botao} onClick={() => setRecursos([...recursos, { texto: '', em_breve: false }])}>+ Adicionar recurso ({recursos.length} de 12)</button>}
        <button disabled={ocupado} className={botaoAzul} onClick={() => enviar({ acao: 'textos', id, subtitulo, recursos }, 'Textos salvos.')}>Salvar textos</button>
        <button disabled={ocupado} className="text-xs text-zinc-500 hover:underline"
          onClick={async () => { if (await enviar({ acao: 'textos_padrao', id }, 'Textos restaurados para o padrão.')) { setSubtitulo(''); setRecursos([]) } }}>Voltar ao padrão do código</button>
      </div>
      {aviso}
    </details>
  )
}

function CartaoPlano({ id, plano, desconto }: { id: PlanoId; plano: ConfigPlanos['planos'][PlanoId]; desconto: number }) {
  const { enviar, ocupado, aviso } = useAcao()
  const gratis = id === 'gratis'
  const [preco, setPreco] = useState(plano.preco_cents == null ? '' : (plano.preco_cents / 100).toFixed(2).replace('.', ','))
  const [notas, setNotas] = useState(plano.notas_mes == null ? '' : String(plano.notas_mes))
  const [usuarios, setUsuarios] = useState(plano.usuarios == null ? '' : String(plano.usuarios))

  const precoCents = preco.trim() === '' ? null : Math.round(parseFloat(preco.replace(/\./g, '').replace(',', '.')) * 100)
  const anual = precoAnual(plano.preco_cents, desconto)

  return (
    <div className={card}>
      <p className="font-medium text-zinc-900">{plano.nome}</p>
      <p className="text-sm text-zinc-500">{plano.descricao}</p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {!gratis && (
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Preço mensal (R$)</label>
            <input value={preco} onChange={e => setPreco(e.target.value)} placeholder="sem valor" inputMode="decimal" className={campo} />
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Notas por mês</label>
          <input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Ilimitado" inputMode="numeric" className={campo} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Usuários</label>
          <input value={usuarios} onChange={e => setUsuarios(e.target.value)} placeholder="Ilimitado" inputMode="numeric" className={campo} />
        </div>
      </div>
      {!gratis && (
        <p className="mt-2 text-xs text-zinc-500">
          Cliente veria: {precoMensalTexto(plano.preco_cents)} por mês{anual ? `, ou R$ ${(anual.total / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por ano (R$ ${(anual.porMes / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} por mês)` : ''}.
        </p>
      )}
      <div className="mt-3">
        <button disabled={ocupado} className={botaoAzul}
          onClick={() => enviar({ acao: 'plano', id, preco_cents: gratis ? 0 : precoCents, notas_mes: notas.trim() === '' ? null : notas, usuarios: usuarios.trim() === '' ? null : usuarios }, `${plano.nome} salvo.`)}>
          Salvar {plano.nome}
        </button>
      </div>
      {aviso}
      <TextosCartao id={id} subtitulo={plano.subtitulo} recursos={plano.recursos} />
    </div>
  )
}

function BlocoDesconto({ pct }: { pct: number }) {
  const { enviar, ocupado, aviso } = useAcao()
  const [valor, setValor] = useState(String(pct))
  return (
    <div className={card}>
      <p className="font-medium text-zinc-900">Desconto do plano anual</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Desconto (%)</label>
          <input value={valor} onChange={e => setValor(e.target.value)} inputMode="decimal" className={`${campo} w-32`} />
        </div>
        <button disabled={ocupado} className={botaoAzul} onClick={() => enviar({ acao: 'desconto', pct: Number(valor.replace(',', '.')) }, 'Desconto salvo.')}>Salvar desconto</button>
      </div>
      <p className="mt-2 text-xs text-zinc-500">O plano anual cobra, de uma vez, 12 vezes o preço mensal com esse desconto. O preço por mês no anual é arredondado para reais inteiros.</p>
      {aviso}
    </div>
  )
}

export default function PlanosClient({ config }: { config: ConfigPlanos }) {
  return (
    <div className="space-y-4">
      <BlocoLanding modo={config.landing_precos} />
      <BlocoContratacao aberta={config.contratacao_aberta} />
      {PLANOS_COM_LIMITES.map(id => <CartaoPlano key={id} id={id} plano={config.planos[id]} desconto={config.desconto_anual_pct} />)}

      <div className={card}>
        <p className="font-medium text-zinc-900">{config.planos.personalizado.nome}</p>
        <p className="text-sm text-zinc-500">Plano sob consulta: não tem preço nem limites aqui, só os textos do cartão na landing.</p>
        <TextosCartao id="personalizado" subtitulo={config.planos.personalizado.subtitulo} recursos={config.planos.personalizado.recursos} />
      </div>

      <BlocoDesconto pct={config.desconto_anual_pct} />

      <div className={card}>
        <p className="font-medium text-zinc-900">Correção do valor na renovação (reajuste)</p>
        <p className="mt-1 text-sm text-zinc-500">Indisponível por enquanto: o FATUR4U ainda não tem assinaturas ativas para reajustar. Assinaturas elegíveis: 0.</p>
      </div>
    </div>
  )
}
