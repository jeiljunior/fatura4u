// Corpo e assunto dos e-mails que o sistema envia — fonte única usada pelo
// envio real (régua de cobrança, alerta de saldo) e pela prévia do painel de
// gestão, pra o que o administrador vê ser exatamente o que o cliente recebe.

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export const ASSUNTO_ALERTA_SALDO = '⚠️ Seu saldo projetado fica negativo nos próximos 7 dias'

export function htmlLembrete(texto: string): string {
  return `<p>${texto.replace(/\n/g, '<br/>')}</p>`
}

export function htmlAlertaSaldo(nomeNegocio: string, saldoAtualCents: number, saldoProjetadoCents: number): string {
  return `
      <p>Olá, ${nomeNegocio}!</p>
      <p>De acordo com o saldo em caixa e as contas a pagar/receber pendentes, seu saldo projetado fica <strong>negativo</strong> nos próximos 7 dias.</p>
      <p>Saldo em caixa atual: <strong>${formatMoney(saldoAtualCents)}</strong><br/>
      Saldo projetado em 7 dias: <strong>${formatMoney(saldoProjetadoCents)}</strong></p>
      <p>Vale dar uma olhada no Financeiro pra ver o que pode ser adiado ou antecipado.</p>
    `
}
