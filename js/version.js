// App version shown in Mais › Versão. On every release bump APP_VERSION here
// AND `VERSION` in sw.js, and add an entry on top of CHANGELOG.
export const APP_VERSION = '1.9';

export const CHANGELOG = [
  {
    version: '1.9', date: '2026-10-31',
    notes: [
      'Coleção por skins: cada peça mostra as skins conhecidas (lançamentos e versões de cor, lista da Beyblade Wiki) e marcas as que tens.',
      'Fotos tuas em cada skin, com o fundo removido no próprio telemóvel; ficam incluídas na cópia de segurança.',
      'Sessão de fotos: fotografa, escolhe a peça e a skin, passa à seguinte.',
      'O Excel exportado inclui a skin de cada peça da coleção.',
    ],
  },
  {
    version: '1.8', date: '2026-10-31',
    notes: [
      'Gráfico de vendas com escolha entre Lucro, Valor vendido e Nº de vendas.',
      'Novo gráfico de compras por mês: Valor gasto ou Nº de compras.',
      'A escolha de cada gráfico fica guardada no dispositivo.',
    ],
  },
  {
    version: '1.7', date: '2026-10-31',
    notes: [
      'Exportar para Excel (.xlsx) em Mais › Dados, no formato da folha original, com totais em fórmulas e folhas por mês, plataformas, encomendas e coleção.',
      'Gráfico Lucro por mês com mês, ano e valor de cada barra; toca num mês para ver as vendas e compras.',
      'Os meses sem movimento também aparecem no gráfico.',
    ],
  },
  {
    version: '1.6', date: '2026-10-31',
    notes: [
      'Importar cópia aceita um ficheiro de datas: preenche datas de compra e venda vazias sem mexer no resto.',
      'Datas recuperadas do histórico de versões do Excel no OneDrive (ficam no gráfico Lucro por mês).',
    ],
  },
  {
    version: '1.5', date: '2026-10-31',
    notes: [
      'Stock = só os artigos do Excel com valor no Predicted Ongoing e sem preço de venda; os restantes não vendidos passam a Guardado.',
      'A lista “Artigos por classificar” do Rever desaparece; ficam só as vendas Vinted/Wallapop por associar.',
    ],
  },
  {
    version: '1.4', date: '2026-10-30',
    notes: [
      'Corrigida a faixa vazia no fundo do ecrã no iPhone (iOS 26): a app usa agora a barra de estado normal. É preciso voltar a instalar a app uma vez.',
      'Removido o ajuste manual da barra da versão 1.3, que deixou de ser preciso.',
    ],
  },
  {
    version: '1.3', date: '2026-10-30',
    notes: [
      'Ajuste manual da barra inferior em Mais › Versão, guardado em cada dispositivo.',
      'Diagnóstico do ecrã para corrigir a posição da barra no iPhone.',
    ],
  },
  {
    version: '1.2', date: '2026-10-30',
    notes: [
      'A barra de separadores fica encostada ao fundo do ecrã no iPhone.',
      'Número de versão em Mais e aviso quando a app é atualizada.',
    ],
  },
  {
    version: '1.1', date: '2026-10-30',
    notes: [
      'Vender / Apagar só aparecem enquanto deslizas um artigo.',
      'Linhas tocadas já não ficam transparentes ao fazer scroll.',
    ],
  },
  {
    version: '1.0', date: '2026-10-29',
    notes: ['Primeira versão: resumo, artigos, coleção, calculadora, encomendas e sincronização.'],
  },
];
