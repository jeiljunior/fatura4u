// Gera public/templates/clientes-modelo.xlsx — modelo de planilha pra
// importação em massa de clientes (Configurações → Importar clientes).
// Rodar de novo sempre que as colunas aceitas por
// app/api/clientes/importar/route.ts mudarem: node scripts/gerar-modelo-clientes.js
const XLSX = require('xlsx')
const path = require('path')

const headers = [
  'Tipo (PF ou PJ)',
  'Nome Completo / Razão Social',
  'CPF/CNPJ',
  'Data de Nascimento',
  'Inscrição Estadual',
  'Inscrição Municipal',
  'Telefone',
  'Email',
  'CEP',
  'Rua',
  'Número',
  'Complemento',
  'Bairro',
  'Cidade',
  'UF',
  'Observações',
]

const exemploPF = [
  'PF', 'Maria da Silva', '123.456.789-00', '15/03/1990', '', '',
  '41 99999-8888', 'maria@example.com', '80010-000', 'Rua das Flores', '123', 'Apto 45',
  'Centro', 'Curitiba', 'PR', 'Cliente exemplo — pode apagar esta linha',
]

const exemploPJ = [
  'PJ', 'Empresa Exemplo LTDA', '12.345.678/0001-90', '', '123456789', '987654',
  '41 3333-2222', 'contato@empresaexemplo.com.br', '80020-000', 'Av. Central', '500', 'Sala 10',
  'Batel', 'Curitiba', 'PR', 'Cliente exemplo — pode apagar esta linha',
]

const sheet = XLSX.utils.aoa_to_sheet([headers, exemploPF, exemploPJ])
sheet['!cols'] = headers.map(h => ({ wch: Math.max(h.length, 18) }))

const workbook = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(workbook, sheet, 'Clientes')

const outPath = path.join(__dirname, '..', 'public', 'templates', 'clientes-modelo.xlsx')
XLSX.writeFile(workbook, outPath)
console.log('Gerado:', outPath)
