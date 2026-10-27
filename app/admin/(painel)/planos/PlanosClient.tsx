'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ConfigPlanos, PlanoId, Recurso } from '@/lib/planosBase'
import { PADRAO, PLANOS_COM_LIMITES, clienteVe, padraoTexto } from '@/lib/planosBase'

const card = 'rounded-xl border border-zinc-200 bg-white p-5'
const campo = 'w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 disabled:opacity-50'
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

function Selo({ children, cor }: { children: React.ReactNode; cor: 'verde' | 'cinza' | 'ambar' }) {
  const c = cor === 'verde' ? 'bg-emerald-100 text-emerald-700' : cor === 'ambar' ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-600'
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${c}`}>{children}</span>
}

function BlocoLanding({ modo }: { modo: ConfigPlanos['landing_precos'] }) {
  const { enviar, ocupado, aviso } = useAcao()
  const finais = modo === 'finais'
  return (
    <div className={card}>
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-medium text-zinc-900">Preços na landing</p>
        <Selo cor={finais ? 'verde' : 'ambar'}>{finais ? 'Mostrados como finais' : 'Valores em definição'}</Selo>
      </div>
      <p className="mt-2 text-sm text-zinc-500">
        Controla só o texto da landing e da seção de planos: com “valores em definição” aparece um aviso no lugar dos preços e dos limites. <strong>Não libera nem bloqueia a contratação</strong>: isso é o quadro abaixo.
      </p>
      <button disabled={ocupado} className={`${botao} mt-3`}
        onClick={() => enviar({ acao: 'landing', modo: finais ? 'em_definicao' : 'finais' }, 'Modo da landing atualizado.')}>
        {finais ? 'Voltar para “valores em definição”' : 'Mostrar como valores finais'}
      </button>
      {aviso}
    </div>
  )
}

function BlocoContratacao({ aberta }: { aberta: boolean }) {
  const { enviar, ocupado, aviso } = useAcao()
  const [confirmacao, setConfirmacao] = useState('')
  return (
    <div className={card}>
      <div className="flex flex-wrap items-center gap-3">
        <p className="font-medium text-zinc-900">Contratação de planos</p>
        <Selo cor={aberta ? 'verde' : 'cinza'}>{aberta ? 'Aberta' : 'Fechada'}</Selo>
        <span className="text-xs text-zinc-500">Cobrança da plataforma: ainda não configurada</span>
      </div>
      <p className="mt-2 text-sm text-zinc-500">
        Fechada: o cliente vê os planos e os preços, mas o botão Contratar não funciona e <strong>nenhum cliente é cobrado</strong>. O plano Grátis segue normal. Antes de liberar, confira: nota fiscal da HTSIGNS, Termos revisados e entregabilidade dos e-mails. Enquanto não existir cobrança de assinatura no FATUR4U, abrir a contratação só leva o cliente ao cadastro.
      </p>
      {aberta ? (
        <button disabled={ocupado} className={`${botao} mt-3`} onClick={() => enviar({ acao: 'contratacao', aberta: false }, 'Contratação fechada.')}>Fechar a contratação</button>
      ) : (
        <div className="mt-3">
          <label className="mb-1 block text-xs text-zinc-500">Digite LIBERAR VENDA para confirmar</label>
          <div className="flex flex-wrap items-center gap-3">
            <input value={confirmacao} onChange={e => setConfirmacao(e.target.value)} placeholder="LIBERAR VENDA" className={`${campo} max-w-[220px]`} />
            <button disabled={ocupado || confirmacao !== 'LIBERAR VENDA'} className={botaoAzul}
              onClick={() => enviar({ acao: 'contratacao', aberta: true, confirmacao }, 'Contratação liberada.')}>Liberar a contratação</button>
          </div>
        </div>
      )}
      {aviso}
    </div>
  )
}

function EditorTextos({ id, subtitulo: sub0, recursos: rec0 }: { id: PlanoId; subtitulo: string; recursos: Recurso[] }) {
  const { enviar, ocupado, aviso } = useAcao()
  const [subtitulo, setSubtitulo] = useState(sub0)
  const [recursos, setRecursos] = useState<Recurso[]>(rec0)
  const [arrastando, setArrastando] = useState<number | null>(null)

  const mover = (de: number, para: number) => {
    if (para < 0 || para >= recursos.length || de === para) return
    const novo = [...recursos]
    const [item] = novo.splice(de, 1)
    novo.splice(para, 0, item)
    setRecursos(novo)
  }

  return (
    <div>
      <label className="mb-1 block text-xs text-zinc-500">Subtítulo do cartão</label>
      <input value={subtitulo} onChange={e => setSubtitulo(e.target.value)} maxLength={120} className={campo} />

      <p className="mb-2 mt-4 text-xs text-zinc-500">Lista de recursos (aparece com ✓ no cartão). Arraste pela alça ⋮⋮ para mudar a ordem:</p>
      <ul className="space-y-2">
        {recursos.map((r, i) => (
          <li key={i}
            draggable={arrastando === i}
            onDragOver={e => { if (arrastando !== null) e.preventDefault() }}
            onDrop={() => { if (arrastando !== null) mover(arrastando, i); setArrastando(null) }}
            onDragEnd={() => setArrastando(null)}
            className="rounded-lg border border-zinc-200 p-2">
            <div className="flex items-center gap-2">
              <span onMouseDown={() => setArrastando(i)} onMouseUp={() => setArrastando(null)} className="cursor-grab select-none px-1 text-zinc-400" title="Arraste para reorganizar">⋮⋮</span>
              <input value={r.texto} maxLength={120} onChange={e => setRecursos(recursos.map((x, k) => k === i ? { ...x, texto: e.target.value } : x))} className={campo} />
            </div>
            <div className="mt-1 flex items-center justify-between pl-7">
              <label className="flex items-center gap-1 text-xs text-zinc-600">
                <input type="checkbox" checked={r.em_breve} onChange={e => setRecursos(recursos.map((x, k) => k === i ? { ...x, em_breve: e.target.checked } : x))} /> selo “em breve”
              </label>
              <button type="button" onClick={() => setRecursos(recursos.filter((_, k) => k !== i))} className="text-xs text-red-600 hover:underline">Remover</button>
            </div>
          </li>
        ))}
      </ul>

      {recursos.length < 12 && (
        <button type="button" className={`${botao} mt-3 !px-3 !py-1.5 text-xs`} onClick={() => setRecursos([...recursos, { texto: '', em_breve: false }])}>
          + Adicionar recurso ({recursos.length} de 12)
        </button>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button disabled={ocupado} className={botaoAzul} onClick={() => enviar({ acao: 'textos', id, subtitulo, recursos }, 'Textos salvos.')}>Salvar textos</button>
        <button type="button" className="text-xs text-zinc-500 hover:underline"
          onClick={() => { setSubtitulo(PADRAO.planos[id].subtitulo); setRecursos(PADRAO.planos[id].recursos.map(r => ({ ...r }))) }}>
          Carregar o texto padrão (depois clique em Salvar)
        </button>
      </div>
      {aviso}
    </div>
  )
}

function CartaoPlano({ id, plano, desconto }: { id: PlanoId; plano: ConfigPlanos['planos'][PlanoId]; desconto: number }) {
  const { enviar, ocupado, aviso } = useAcao()
  const gratis = id === 'gratis'
  const [preco, setPreco] = useState(plano.preco_cents == null ? '' : (plano.preco_cents / 100).toFixed(2).replace('.', ','))
  const [notas, setNotas] = useState(plano.notas_mes == null ? '' : String(plano.notas_mes))
  const [notasIlimitado, setNotasIlimitado] = useState(plano.notas_mes == null)
  const [usuarios, setUsuarios] = useState(plano.usuarios == null ? '' : String(plano.usuarios))
  const [usuariosIlimitado, setUsuariosIlimitado] = useState(plano.usuarios == null)

  const precoCents = preco.trim() === '' ? null : Math.round(parseFloat(preco.replace(/\./g, '').replace(',', '.')) * 100)

  return (
    <div className={card}>
      <p className="font-medium text-zinc-900">{plano.nome}</p>
      <p className="text-sm text-zinc-500">{plano.descricao}</p>

      {!gratis && (
        <div className="mt-4">
          <label className="mb-1 block text-xs text-zinc-500">Preço mensal (R$)</label>
          <input value={preco} onChange={e => setPreco(e.target.value)} placeholder="sem valor" inputMode="decimal" className={campo} />
        </div>
      )}

      <div className="mt-4">
        <label className="mb-1 block text-xs text-zinc-500">Notas por mês</label>
        <input value={notasIlimitado ? '' : notas} onChange={e => setNotas(e.target.value)} disabled={notasIlimitado} placeholder="Ilimitado" inputMode="numeric" className={campo} />
        <label className="mt-1 flex items-center gap-1 text-xs text-zinc-600"><input type="checkbox" checked={notasIlimitado} onChange={e => setNotasIlimitado(e.target.checked)} /> Ilimitado</label>
      </div>
      <div className="mt-4">
        <label className="mb-1 block text-xs text-zinc-500">Usuários</label>
        <input value={usuariosIlimitado ? '' : usuarios} onChange={e => setUsuarios(e.target.value)} disabled={usuariosIlimitado} placeholder="Ilimitado" inputMode="numeric" className={campo} />
        <label className="mt-1 flex items-center gap-1 text-xs text-zinc-600"><input type="checkbox" checked={usuariosIlimitado} onChange={e => setUsuariosIlimitado(e.target.checked)} /> Ilimitado</label>
      </div>

      <button disabled={ocupado} className={`${botaoAzul} mt-4 w-full`}
        onClick={() => enviar({
          acao: 'plano', id, preco_cents: gratis ? 0 : precoCents,
          notas_mes: notasIlimitado || notas.trim() === '' ? null : notas,
          usuarios: usuariosIlimitado || usuarios.trim() === '' ? null : usuarios,
        }, `${plano.nome} salvo.`)}>
        Salvar {plano.nome}
      </button>
      {aviso}

      <details className="mt-3 rounded-lg border border-zinc-200 p-3">
        <summary className="cursor-pointer text-sm font-medium text-blue-700">Textos do cartão na landing</summary>
        <div className="mt-3"><EditorTextos id={id} subtitulo={plano.subtitulo} recursos={plano.recursos} /></div>
      </details>

      {!gratis && (
        <p className="mt-3 rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-600">
          <strong>Cliente vê:</strong> {clienteVe(plano.preco_cents, desconto)}.
        </p>
      )}
      <p className="mt-3 text-xs text-zinc-500">Padrão do código: {padraoTexto(id)}.</p>
      <button type="button" disabled={ocupado} className="mt-2 text-xs text-zinc-500 hover:underline"
        onClick={() => enviar({ acao: 'plano_padrao', id }, 'Valores restaurados para o padrão.')}>Voltar ao padrão do código</button>
    </div>
  )
}

function BlocoDesconto({ pct }: { pct: number }) {
  const { enviar, ocupado, aviso } = useAcao()
  const [valor, setValor] = useState(String(pct))
  return (
    <div className={card}>
      <p className="font-medium text-zinc-900">Desconto do plano anual</p>
      <label className="mb-1 mt-3 block text-xs text-zinc-500">Desconto (%)</label>
      <div className="flex flex-wrap items-center gap-3">
        <input value={valor} onChange={e => setValor(e.target.value)} inputMode="decimal" className={`${campo} w-24`} />
        <button disabled={ocupado} className={botaoAzul} onClick={() => enviar({ acao: 'desconto', pct: Number(valor.replace(',', '.')) }, 'Desconto salvo.')}>Salvar desconto</button>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        O plano anual cobra, de uma vez, 12 vezes o preço mensal com esse desconto. O preço por mês no anual é arredondado para reais inteiros (por exemplo, R$ 39,00 com 25% vira R$ 29,00 por mês).
      </p>
      {aviso}
    </div>
  )
}

export default function PlanosClient({ config }: { config: ConfigPlanos }) {
  return (
    <div className="space-y-4">
      <BlocoLanding modo={config.landing_precos} />
      <BlocoContratacao aberta={config.contratacao_aberta} />

      <div className="grid gap-4 md:grid-cols-3">
        {PLANOS_COM_LIMITES.map(id => <CartaoPlano key={id} id={id} plano={config.planos[id]} desconto={config.desconto_anual_pct} />)}
      </div>

      <div className={card}>
        <p className="font-medium text-zinc-900">{config.planos.personalizado.nome}</p>
        <p className="mb-4 text-sm text-zinc-500">Plano sob consulta: não tem preço nem limites aqui, só os textos do cartão na landing.</p>
        <EditorTextos id="personalizado" subtitulo={config.planos.personalizado.subtitulo} recursos={config.planos.personalizado.recursos} />
      </div>

      <BlocoDesconto pct={config.desconto_anual_pct} />

      <div className={card}>
        <p className="font-medium text-zinc-900">Correção do valor na renovação (reajuste)</p>
        <p className="mt-2 text-sm text-zinc-500">
          Aplica um percentual sobre o valor atual de cada assinatura ativa; o novo valor vale só na próxima cobrança. Indisponível por enquanto: o FATUR4U ainda não tem assinaturas ativas para reajustar. Assinaturas elegíveis: 0.
        </p>
      </div>
    </div>
  )
}
