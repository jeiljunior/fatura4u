// Comunicados (mala direta) pros usuários do FATUR4U: texto simples vira HTML
// seguro, cada e-mail leva link de descadastro assinado, e o envio sai em
// lotes pequenos por dia (cron) a partir de uma fila.
import crypto from 'crypto'
import supabaseAdmin from '@/lib/supabase/admin'
import { sendComunicadoEmail } from '@/lib/email'

const SITE = 'https://fatura4u.com.br'
// Resend (plano gratuito) limita ~100 e-mails/dia no total — o lote deixa
// folga pros e-mails da régua de cobrança e dos alertas.
export const LOTE_POR_EXECUCAO = 40

function segredo(): string {
  const s = process.env.CRON_SECRET
  if (!s) throw new Error('CRON_SECRET não configurado')
  return s
}

// Token que só quem recebeu o e-mail consegue montar: impede descadastrar o
// e-mail de outra pessoa trocando o endereço na URL.
export function tokenDescadastro(email: string): string {
  return crypto.createHmac('sha256', segredo()).update(email.toLowerCase().trim()).digest('hex')
}

export function tokenValido(email: string, token: string): boolean {
  const esperado = Buffer.from(tokenDescadastro(email))
  const recebido = Buffer.from(token)
  return esperado.length === recebido.length && crypto.timingSafeEqual(esperado, recebido)
}

export function urlDescadastro(email: string): string {
  return `${SITE}/descadastrar?e=${encodeURIComponent(email)}&t=${tokenDescadastro(email)}`
}

function escapar(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Parágrafos separados por linha em branco; quebra simples vira <br/>.
export function corpoParaHtml(corpo: string): string {
  return corpo
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p style="margin:0 0 14px">${escapar(p).replace(/\n/g, '<br/>')}</p>`)
    .join('')
}

export function htmlComunicado(corpo: string, urlSair: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#1e293b;max-width:560px">` +
    corpoParaHtml(corpo) +
    `<hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0 12px"/>` +
    `<p style="font-size:12px;color:#71717a;margin:0">Você recebe este e-mail por ter uma conta no FATUR4U. ` +
    `<a href="${urlSair}" style="color:#71717a">Cancelar inscrição</a>.</p></div>`
}

// Todos os e-mails de login cadastrados (únicos, minúsculos).
export async function listarDestinatarios(): Promise<string[]> {
  const emails = new Set<string>()
  for (let pagina = 1; pagina <= 50; pagina++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: pagina, perPage: 200 })
    if (error) throw new Error(error.message)
    for (const u of data.users) if (u.email) emails.add(u.email.toLowerCase().trim())
    if (data.users.length < 200) break
  }
  return [...emails]
}

// Cria a fila (idempotente) e passa o comunicado pra 'enviando'. Quem já se
// descadastrou entra como 'pulado' pra constar no relatório.
export async function enfileirar(comunicadoId: string): Promise<{ total: number; pulados: number }> {
  const destinatarios = await listarDestinatarios()
  const { data: descad } = await supabaseAdmin.from('comunicado_descadastros').select('email')
  const fora = new Set((descad ?? []).map(d => d.email.toLowerCase()))

  const linhas = destinatarios.map(email => ({
    comunicado_id: comunicadoId, email, status: fora.has(email) ? 'pulado' : 'na_fila',
  }))
  if (linhas.length) {
    const { error } = await supabaseAdmin.from('comunicado_envios').upsert(linhas, { onConflict: 'comunicado_id,email', ignoreDuplicates: true })
    if (error) throw new Error(error.message)
  }
  await supabaseAdmin.from('comunicados').update({ status: 'enviando', enviado_em: new Date().toISOString() }).eq('id', comunicadoId)
  return { total: linhas.length, pulados: linhas.filter(l => l.status === 'pulado').length }
}

type Remetente = (to: string, subject: string, html: string, urlSair: string) => Promise<{ ok: boolean; erro?: string }>

// Envia até `limite` e-mails da fila (do comunicado mais antigo ao mais novo).
// `remetente` é injetável só pra teste.
export async function enviarLote(limite = LOTE_POR_EXECUCAO, remetente: Remetente = sendComunicadoEmail): Promise<{ enviados: number; falhas: number }> {
  let restante = limite
  let enviados = 0
  let falhas = 0

  const { data: comunicados } = await supabaseAdmin.from('comunicados').select('id, assunto, corpo').eq('status', 'enviando').order('enviado_em')

  for (const c of comunicados ?? []) {
    if (restante <= 0) break
    const { data: fila } = await supabaseAdmin
      .from('comunicado_envios').select('id, email').eq('comunicado_id', c.id).eq('status', 'na_fila').limit(restante)

    for (const item of fila ?? []) {
      // Descadastro feito depois de enfileirar também vale.
      const { data: saiu } = await supabaseAdmin.from('comunicado_descadastros').select('email').eq('email', item.email).maybeSingle()
      if (saiu) {
        await supabaseAdmin.from('comunicado_envios').update({ status: 'pulado' }).eq('id', item.id)
        continue
      }
      const url = urlDescadastro(item.email)
      const r = await remetente(item.email, c.assunto, htmlComunicado(c.corpo, url), url)
      if (r.ok) {
        enviados++
        await supabaseAdmin.from('comunicado_envios').update({ status: 'enviado', sent_at: new Date().toISOString() }).eq('id', item.id)
      } else {
        falhas++
        await supabaseAdmin.from('comunicado_envios').update({ status: 'falhou', erro: (r.erro ?? '').slice(0, 300) }).eq('id', item.id)
      }
      restante--
    }

    const { count } = await supabaseAdmin
      .from('comunicado_envios').select('*', { count: 'exact', head: true }).eq('comunicado_id', c.id).eq('status', 'na_fila')
    if ((count ?? 0) === 0) await supabaseAdmin.from('comunicados').update({ status: 'concluido' }).eq('id', c.id)
  }

  return { enviados, falhas }
}

export type ResumoComunicado = {
  id: string; assunto: string; status: string; created_at: string
  enviados: number; naFila: number; falhasOuPulados: number
}

export async function listarComunicados(): Promise<ResumoComunicado[]> {
  const { data: lista } = await supabaseAdmin.from('comunicados').select('id, assunto, status, created_at').order('created_at', { ascending: false })
  const { data: envios } = await supabaseAdmin.from('comunicado_envios').select('comunicado_id, status').limit(50000)
  return (lista ?? []).map(c => {
    const e = (envios ?? []).filter(x => x.comunicado_id === c.id)
    return {
      ...c,
      enviados: e.filter(x => x.status === 'enviado').length,
      naFila: e.filter(x => x.status === 'na_fila').length,
      falhasOuPulados: e.filter(x => x.status === 'falhou' || x.status === 'pulado').length,
    }
  })
}
