// Catálogo dos e-mails que o FATUR4U envia, com dados de exemplo — usado pela
// aba "E-mails" do painel de gestão (ver e enviar prévia ao administrador).
import { montarMensagem, assuntoEmail } from '@/lib/faturamento/regua'
import { htmlLembrete, htmlAlertaSaldo, ASSUNTO_ALERTA_SALDO } from '@/lib/emailTemplates'
import { htmlComunicado } from '@/lib/comunicados'
import { lerConfig } from '@/lib/appSettings'

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
    {
      id: 'comunicado', titulo: 'Comunicado (mala direta)', quando: 'Enviado aos usuários do FATUR4U, em lotes pequenos por dia',
      assunto: 'Novidades do FATUR4U',
      html: htmlComunicado('Olá! Esta é uma amostra de comunicado do FATUR4U.\n\nAqui entram as novidades e avisos para os usuários.', 'https://fatura4u.com.br/descadastrar'),
    },
  ]
}

// Ordem de exibição escolhida pelo administrador (guardada em app_settings).
export async function catalogoEmailsOrdenado(): Promise<EmailCatalogo[]> {
  const base = catalogoEmails()
  const ordem = (await lerConfig<string[]>('emails_ordem')) ?? []
  const posicao = (id: string) => { const i = ordem.indexOf(id); return i === -1 ? Number.MAX_SAFE_INTEGER : i }
  return [...base].sort((a, b) => posicao(a.id) - posicao(b.id))
}
