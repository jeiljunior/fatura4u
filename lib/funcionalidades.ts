// Conteúdo das páginas de detalhe de cada funcionalidade (/funcionalidades/[slug]),
// linkadas a partir dos cards da landing page (app/page.tsx).
export type Funcionalidade = {
  slug: string
  icon: string
  title: string
  shortDesc: string
  longDesc: string
  bullets: string[]
}

export const FUNCIONALIDADES: Funcionalidade[] = [
  {
    slug: 'nfse',
    icon: '🧾',
    title: 'Emissão de NFS-e Nacional',
    shortDesc: 'Emita nota fiscal de serviço direto pra Prefeitura, com certificado digital A1 e assinatura automática.',
    longDesc: 'Emita nota fiscal de serviço (NFS-e Nacional) sem depender de portal da Prefeitura, planilha ou contador pra cada nota. O FATURA4U monta, assina e envia a DPS pra Sefin Nacional usando seu certificado digital A1.',
    bullets: [
      'Assinatura digital automática com seu certificado A1 (cifrado, nunca exposto)',
      'Configuração fiscal única: regime tributário, código de serviço, alíquota de ISS',
      'Emissão automática assim que uma cobrança é confirmada, ou manual quando você quiser',
      'Baixe a DANFSe (PDF) direto do painel',
    ],
  },
  {
    slug: 'cobranca-pix-boleto-cartao',
    icon: '💲',
    title: 'Cobrança PIX, boleto e cartão',
    shortDesc: 'Conecte sua conta Asaas ou Mercado Pago e cobre seus clientes com o meio de pagamento que preferirem.',
    longDesc: 'Conecte a conta que você já usa — Asaas ou Mercado Pago — e comece a cobrar sem trocar de gateway nem pagar duas taxas. Você escolhe o meio de pagamento por cobrança: Pix, boleto ou cartão.',
    bullets: [
      'Sua própria conta Asaas ou Mercado Pago — o dinheiro cai direto pra você',
      'Escolha o meio de pagamento cobrança a cobrança',
      'Status atualizado automaticamente por webhook assim que o cliente paga',
      'QR Code Pix e link de boleto gerados na hora',
    ],
  },
  {
    slug: 'link-pagamento',
    icon: '🔗',
    title: 'Link de pagamento único',
    shortDesc: 'Cada cobrança gera um link — o cliente abre e escolhe como pagar, sem precisar entrar em painel nenhum.',
    longDesc: 'Toda cobrança criada no FATURA4U já sai com um link de pagamento pronto. Copie e cole no WhatsApp, e-mail ou onde for mais fácil — o cliente abre, vê o valor e paga, sem precisar de conta nem senha.',
    bullets: [
      'Um link por cobrança, gerado automaticamente',
      'Funciona pra cobrança avulsa e recorrente',
      'O cliente não precisa se cadastrar em nada pra pagar',
      'Reaproveitado pelos lembretes automáticos da régua de cobrança',
    ],
  },
  {
    slug: 'cobranca-recorrente',
    icon: '🔁',
    title: 'Cobrança recorrente automática',
    shortDesc: 'Cadastre cliente, valor e dia de vencimento uma vez. O sistema gera a cobrança real todo mês, sozinho.',
    longDesc: 'Pra quem cobra mensalidade, assinatura ou qualquer valor fixo recorrente: cadastre uma vez e esqueça. Um processo automático gera a cobrança de verdade no seu gateway, todo mês, no dia certo.',
    bullets: [
      'Cadastre cliente, valor, forma de pagamento e dia do vencimento uma única vez',
      'Cobrança real gerada automaticamente todo mês, com link de pagamento',
      'Pause, retome ou cancele a qualquer momento',
      'Se algo falhar (ex: gateway fora do ar), tenta de novo no dia seguinte — nenhuma cobrança se perde',
    ],
  },
  {
    slug: 'regua-cobranca',
    icon: '📲',
    title: 'Régua de cobrança automática',
    shortDesc: 'Lembrete por WhatsApp e e-mail antes, no dia e depois do vencimento — sem você precisar cobrar na mão.',
    longDesc: 'Pare de mandar mensagem de cobrança manualmente. A régua avisa o cliente sozinha, nos momentos certos — antes do vencimento, no dia, e se atrasar — pelos canais que você escolher.',
    bullets: [
      'Lembretes automáticos: 3 dias antes, no dia, e 1/3/7 dias após o vencimento',
      'WhatsApp e e-mail, com o link de pagamento incluso na mensagem',
      'Você decide quais canais ficam ativos, nas Configurações',
      'Nunca manda o mesmo lembrete duas vezes',
    ],
  },
  {
    slug: 'contas-a-pagar',
    icon: '📉',
    title: 'Contas a pagar',
    shortDesc: 'Controle suas próprias despesas — aluguel, fornecedores, impostos — no mesmo painel da cobrança.',
    longDesc: 'Além do que você recebe, controle o que você paga: aluguel, fornecedores, impostos, assinaturas. Um painel simples pra nunca perder o prazo das suas próprias contas.',
    bullets: [
      'Cadastre descrição, categoria, valor e vencimento',
      'Veja de cara quanto está pendente e quanto já venceu',
      'Marque como paga com um clique, ou reabra se precisar',
      'Categorias prontas: aluguel, fornecedores, impostos, assinaturas, salários',
    ],
  },
  {
    slug: 'clientes',
    icon: '👥',
    title: 'Cadastro de clientes PF/PJ',
    shortDesc: 'Organize os clientes que você atende, com CPF/CNPJ pra emissão de nota e cobrança.',
    longDesc: 'Um cadastro único de clientes, pessoa física ou jurídica, com os dados que a cobrança e a nota fiscal precisam — sem retrabalho de digitar tudo de novo toda vez que for cobrar ou emitir.',
    bullets: [
      'CPF ou CNPJ, com busca automática de dados por CNPJ',
      'Telefone e e-mail usados pela régua de cobrança automática',
      'Histórico de cobranças e notas por cliente',
      'Mesmo cadastro serve pra cobrança avulsa, recorrente e nota fiscal',
    ],
  },
  {
    slug: 'certificado-digital',
    icon: '🔒',
    title: 'Certificado digital protegido',
    shortDesc: 'Seu certificado A1 fica cifrado — nunca é exposto, só usado no momento de emitir a nota.',
    longDesc: 'Seu certificado digital A1 é o que autentica cada nota fiscal emitida em seu nome — por isso ele fica armazenado cifrado, e só é usado no instante exato de assinar uma DPS. Nunca fica exposto, nem pra você.',
    bullets: [
      'Armazenamento cifrado, nunca em texto puro',
      'Usado apenas no momento da assinatura da nota fiscal',
      'Teste de conexão antes de emitir de verdade, pra validar que está tudo certo',
      'Alerta de validade antes do certificado vencer',
    ],
  },
  {
    slug: 'painel',
    icon: '📊',
    title: 'Painel simples e centralizado',
    shortDesc: 'Acompanhe cobranças pendentes, recorrências, contas a pagar e notas emitidas em um só lugar.',
    longDesc: 'Tudo o que você precisa acompanhar do seu financeiro, num painel só — sem planilha, sem pular de sistema em sistema. Cobranças, recorrências, contas a pagar e notas fiscais, organizados e visuais.',
    bullets: [
      'Cobranças pendentes, recebidas e vencidas, de relance',
      'Cobranças recorrentes ativas e a próxima data de cada uma',
      'Contas a pagar com total pendente e total vencido',
      'Notas fiscais emitidas, com DANFSe pra baixar',
    ],
  },
]

export function getFuncionalidade(slug: string): Funcionalidade | undefined {
  return FUNCIONALIDADES.find(f => f.slug === slug)
}
