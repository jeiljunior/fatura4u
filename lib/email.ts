// Envio de e-mail via Resend — o outro canal da régua de cobrança
// (lib/faturamento/regua.ts). Chave é da plataforma (não por tenant), como
// qualquer SaaS que manda e-mail transacional a partir do próprio domínio
// verificado — precisa de RESEND_API_KEY configurada e do domínio
// fatura4u.com.br verificado na conta Resend antes de funcionar de verdade.
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export async function sendReminderEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!resend) {
    console.error('[email] RESEND_API_KEY não configurado — nenhum e-mail está sendo enviado')
    return false
  }

  try {
    const { error } = await resend.emails.send({
      from: 'FATUR4U <cobranca@fatura4u.com.br>',
      to,
      subject,
      html,
    })
    if (error) {
      console.error('[email] erro ao enviar via Resend:', error)
      return false
    }
    return true
  } catch (e) {
    console.error('[email] erro ao enviar:', e)
    return false
  }
}
