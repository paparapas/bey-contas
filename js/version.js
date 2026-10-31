// App version shown in Mais › Versão. On every release bump APP_VERSION here
// AND `VERSION` in sw.js, and add an entry on top of CHANGELOG.
export const APP_VERSION = '1.6';

export const CHANGELOG = [
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
