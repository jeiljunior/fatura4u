// Catálogo dos e-mails que o FATUR4U envia, com dados de exemplo — usado pela
// aba "E-mails" do painel de gestão (ver e enviar prévia ao administrador).
import { montarMensagem, assuntoEmail } from '@/lib/faturamento/regua'
import { htmlLembrete, htmlAlertaSaldo, ASSUNTO_ALERTA_SALDO } from '@/lib/emailTemplates'

export type EmailCatalogo = {
  id: string
  titulo: string
  quando: string
  assunto: string
  html: string
}

const EXEMPLO = { cliente: 'Maria Silva', negocio: 'Sua Empresa', valor: 'R$ 150,00', link: 'https://fatura4u.com.br/exemplo-de-link' }

function lembrete(offset: number): { assunto: string; html: string } {
  const texto = montarMensagem(offset, EXEMPLO.cliente, EXEMPLO.negocio, EXEMPLO.valor, EXEMPLO.link)
  return { assunto: assuntoEmail(offset), html: htmlLembrete(texto) }
}

export function catalogoEmails(): EmailCatalogo[] {
  const antes = lembrete(3)
  const hoje = lembrete(0)
  const atraso = lembrete(-3)
  return [
    { id: 'lembrete_antes', titulo: 'Lembrete: cobrança perto de vencer', quando: 'Enviado ao cliente final 1, 3 e 7 dias antes do vencimento', ...antes },
    { id: 'lembrete_hoje', titulo: 'Lembrete: cobrança vence hoje', quando: 'Enviado ao cliente final no dia do vencimento', ...hoje },
    { id: 'lembrete_atraso', titulo: 'Lembrete: cobrança vencida', quando: 'Enviado ao cliente final 3 dias depois do vencimento', ...atraso },
    {
      id: 'alerta_saldo', titulo: 'Alerta de saldo projetado negativo', quando: 'Enviado ao dono do negócio, no máximo uma vez por dia',
      assunto: ASSUNTO_ALERTA_SALDO, html: htmlAlertaSaldo(EXEMPLO.negocio, 120000, -35000),
    },
  ]
}
