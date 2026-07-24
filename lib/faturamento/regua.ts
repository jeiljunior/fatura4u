// Régua de cobrança: manda lembrete automático por WhatsApp e/ou e-mail pro
// cliente final antes, no dia, e depois do vencimento — chamado pelo cron
// diário (app/api/cron/regua-cobranca).
import supabaseAdmin from '@/lib/supabase/admin'
import { sendWhatsAppText } from '@/lib/whatsapp'
import { sendReminderEmail } from '@/lib/email'

// Negativo = dias antes do vencimento, 0 = vence hoje, positivo = dias em atraso.
const OFFSETS = [-3, 0, 1, 3, 7] as const

type ChargeParaLembrete = {
  id: string
  business_id: string
  valor_cents: number
  due_date: string
  payment_link: string | null
  customers: { name: string; phone: string | null; email: string | null } | { name: string; phone: string | null; email: string | null }[] | null
  businesses: { name: string } | { name: string }[] | null
}

function one<T>(rel: T | T[] | null): T | null {
  if (!rel) return null
  return Array.isArray(rel) ? rel[0] ?? null : rel
}

// due_date - hoje: positivo = ainda não venceu, negativo = já venceu
function diasParaVencer(dueDate: string, hoje: string): number {
  const a = new Date(`${dueDate}T00:00:00Z`).getTime()
  const b = new Date(`${hoje}T00:00:00Z`).getTime()
  return Math.round((a - b) / 86400000)
}

type TemplatesRegua = { antes?: string | null; hoje?: string | null; atraso?: string | null }

function substituirPlaceholders(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, v), template)
}

// Se o tenant customizou a mensagem em Configurações, usa ela (com
// placeholders {cliente} {negocio} {valor} {dias} {link} substituídos).
// Senão, cai no texto padrão hardcoded abaixo.
function montarMensagem(offset: number, nomeCliente: string, nomeNegocio: string, valorFmt: string, link: string | null, templates: TemplatesRegua = {}): string {
  const linkTxt = link ? `\n\nPague aqui: ${link}` : ''
  const varsBase = { cliente: nomeCliente, negocio: nomeNegocio, valor: valorFmt, link: link ?? '' }

  if (offset > 0) {
    const dias = `${offset} dia${offset > 1 ? 's' : ''}`
    if (templates.antes) return substituirPlaceholders(templates.antes, { ...varsBase, dias })
    return `Olá, ${nomeCliente}! Sua cobrança de ${valorFmt} com ${nomeNegocio} vence em ${dias}.${linkTxt}`
  }
  if (offset === 0) {
    if (templates.hoje) return substituirPlaceholders(templates.hoje, varsBase)
    return `Olá, ${nomeCliente}! Sua cobrança de ${valorFmt} com ${nomeNegocio} vence hoje.${linkTxt}`
  }
  const atraso = Math.abs(offset)
  const dias = `${atraso} dia${atraso > 1 ? 's' : ''}`
  if (templates.atraso) return substituirPlaceholders(templates.atraso, { ...varsBase, dias })
  return `Olá, ${nomeCliente}, notamos que sua cobrança de ${valorFmt} com ${nomeNegocio} está vencida há ${dias}. Regularize quando puder.${linkTxt}`
}

function assuntoEmail(offset: number): string {
  if (offset > 0) return `Sua cobrança vence em ${offset} dia${offset > 1 ? 's' : ''}`
  if (offset === 0) return 'Sua cobrança vence hoje'
  return 'Cobrança vencida'
}

async function jaEnviado(chargeId: string, offset: number, canal: 'whatsapp' | 'email'): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('charge_reminders')
    .select('id')
    .eq('charge_id', chargeId)
    .eq('offset_dias', offset)
    .eq('canal', canal)
    .maybeSingle()
  return !!data
}

export async function enviarLembretesDoDia(): Promise<{ verificadas: number; enviadas: number; erros: number }> {
  const hoje = new Date().toISOString().slice(0, 10)

  const { data: charges } = await supabaseAdmin
    .from('charges')
    .select('id, business_id, valor_cents, due_date, payment_link, customers(name, phone, email), businesses(name)')
    .not('due_date', 'is', null)
    .in('status', ['pendente', 'confirmada', 'vencida'])

  let enviadas = 0
  let erros = 0
  let verificadas = 0

  for (const raw of (charges ?? []) as ChargeParaLembrete[]) {
    const offset = diasParaVencer(raw.due_date, hoje)
    if (!OFFSETS.includes(offset as typeof OFFSETS[number])) continue

    verificadas++

    const customer = one(raw.customers)
    const business = one(raw.businesses)
    if (!customer) continue

    const valorFmt = `R$ ${(raw.valor_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

    try {
      const { data: config } = await supabaseAdmin
        .from('faturamento_config')
        .select('regua_whatsapp_ativa, regua_email_ativa, regua_msg_antes, regua_msg_hoje, regua_msg_atraso')
        .eq('business_id', raw.business_id)
        .maybeSingle()

      const texto = montarMensagem(offset, customer.name, business?.name ?? 'a empresa', valorFmt, raw.payment_link, {
        antes: config?.regua_msg_antes,
        hoje: config?.regua_msg_hoje,
        atraso: config?.regua_msg_atraso,
      })

      if (customer.phone && (config?.regua_whatsapp_ativa ?? true) && !(await jaEnviado(raw.id, offset, 'whatsapp'))) {
        const ok = await sendWhatsAppText(raw.business_id, customer.phone, texto)
        if (ok) {
          await supabaseAdmin.from('charge_reminders').insert({ charge_id: raw.id, offset_dias: offset, canal: 'whatsapp' })
          enviadas++
        }
      }

      if (customer.email && (config?.regua_email_ativa ?? true) && !(await jaEnviado(raw.id, offset, 'email'))) {
        const ok = await sendReminderEmail(customer.email, assuntoEmail(offset), `<p>${texto.replace(/\n/g, '<br/>')}</p>`)
        if (ok) {
          await supabaseAdmin.from('charge_reminders').insert({ charge_id: raw.id, offset_dias: offset, canal: 'email' })
          enviadas++
        }
      }
    } catch {
      erros++
    }
  }

  return { verificadas, enviadas, erros }
}
