// App version shown in Mais › Versão. On every release bump APP_VERSION here
// AND `VERSION` in sw.js, and add an entry on top of CHANGELOG.
export const APP_VERSION = '1.3';

export const CHANGELOG = [
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
