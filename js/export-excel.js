// Builds the Excel export: same idea as the original "JPY AMAZON Control"
// sheet (purchases, sales, Predicted Ongoing, totals as live formulas) plus
// sheets for months, platforms, orders, collection and pending reviews.
import { state, find } from './store.js';
import { STATUS, orderShare, itemCost, itemNet, itemProfit, monthly, byPlatform, collectionValue } from './calc.js';
import { buildXlsx, dateSerial, S } from './xlsx.js';
import { TYPES } from './views/colecao.js';

const PL = 'PL Gains';
const r2 = (n) => Math.round((n || 0) * 100) / 100;
const date = (iso) => (iso ? { v: dateSerial(iso), s: S.date } : null);
const eur = (n, extra = {}) => (n === null || n === undefined ? null : { v: r2(n), s: S.eur, ...extra });
const head = (labels) => labels.map((v) => ({ v, s: S.header }));

// Sheet order: imported Excel rows keep their row order, newer items follow by purchase date.
function orderedItems() {
  const key = (it) => (it.id.startsWith('x') ? +it.id.slice(1) : 1e6);
  return [...state.items].sort((a, b) => key(a) - key(b) || (a.buyDate || '').localeCompare(b.buyDate || '') || (a.updatedAt || 0) - (b.updatedAt || 0));
}

function plSheet() {
  const items = orderedItems();
  const first = 9, last = Math.max(first, first + items.length - 1);
  const col = (c) => `${c}${first}:${c}${last}`;
  const k = { spent: 0, sales: 0, stock: 0 };
  const rows = [];
  rows[0] = [{ v: `Bey Contas — exportado em ${new Date().toLocaleDateString('pt-PT')}`, s: S.title }];
  items.forEach((it, i) => {
    const r = first + i, cost = itemCost(it), share = orderShare(it);
    const sold = it.status === 'sold', est = it.status === 'stock' ? it.estPrice || null : null;
    k.spent += cost; if (sold) k.sales += itemNet(it); if (est) k.stock += est;
    rows[r - 1] = [
      it.name, STATUS[it.status]?.label || it.status, date(it.buyDate), it.source || null,
      it.orderId ? find('orders', it.orderId)?.name || null : null,
      it.costJpy ? { v: Math.round(it.costJpy), s: S.jpy } : null, eur(it.costEur || 0), eur(share),
      { f: `G${r}+H${r}`, v: r2(cost), s: S.eur },
      date(sold ? it.saleDate : null), sold ? it.platform || null : null,
      sold ? eur(it.salePrice || 0) : null, sold && it.fees ? eur(it.fees) : null,
      { f: `IF(B${r}="Vendido",L${r}-M${r}-I${r},"")`, v: sold ? r2(itemProfit(it)) : '', s: S.eur },
      eur(est), { f: `IF(O${r}>0,O${r}-I${r},"")`, v: est ? r2(est - cost) : '', s: S.eur },
      it.notes || null,
    ];
  });
  const realized = k.sales - k.spent;
  rows[2] = [{ v: 'Total gasto', s: S.bold }, { f: `SUM(${col('I')})`, v: r2(k.spent), s: S.eurBold }, null,
    { v: 'Valor em stock (Predicted Ongoing)', s: S.bold }, null, null, { f: `SUM(${col('O')})`, v: r2(k.stock), s: S.eurBold }];
  rows[3] = [{ v: 'Total vendas (líquido)', s: S.bold }, { f: `SUM(${col('L')})-SUM(${col('M')})`, v: r2(k.sales), s: S.eurBold }, null,
    { v: 'Resultado previsto', s: S.bold }, null, null, { f: 'B5+G3', v: r2(realized + k.stock), s: S.eurBold }];
  rows[4] = [{ v: 'Resultado atual', s: S.bold }, { f: 'B4-B3', v: r2(realized), s: S.eurBold }, null,
    { v: 'Câmbio JPY → EUR', s: S.bold }, null, null, { v: state.settings.rate, s: S.rate }];
  rows[5] = [{ v: 'Coleção (valor)', s: S.bold }, { f: "'Coleção'!B1", v: r2(collectionValue()), s: S.eurBold }];
  rows[first - 2] = head(['Artigo', 'Estado', 'Data compra', 'Origem', 'Encomenda', 'Preço Compra JPY', 'Preço Compra Eur',
    'Portes/taxas Eur', 'Custo total Eur', 'Data venda', 'Plataforma', 'Preço Venda Eur', 'Taxas venda Eur', 'Ganho',
    'Predicted Ongoing', 'Margem prevista', 'Notas']);
  return {
    name: PL, rows, freezeRow: first - 1, autoFilter: `A${first - 1}:Q${last}`,
    cols: [38, 11, 12, 12, 18, 14, 14, 14, 14, 12, 12, 14, 14, 12, 15, 15, 30],
    posNeg: [`B5`, `G4`, `N${first}:N${last}`, `P${first}:P${last}`],
    range: { first, last },
  };
}

function monthSheet(pl) {
  const { first, last } = pl.range;
  const ref = (c) => `'${PL}'!$${c}$${first}:$${c}$${last}`;
  const rows = [head(['Mês', 'Vendas (líquido)', 'Lucro das vendas', 'Gasto em compras'])];
  for (const [ym, m] of monthly()) {
    const [y, mo] = ym.split('-').map(Number);
    const between = (c) => `${ref(c)},">="&DATE(${y},${mo},1),${ref(c)},"<"&DATE(${y},${mo + 1},1)`;
    rows.push([
      { v: dateSerial(`${ym}-01`), s: S.month },
      { f: `SUMIFS(${ref('L')},${between('J')})-SUMIFS(${ref('M')},${between('J')})`, v: r2(m.sales), s: S.eur },
      { f: `SUMIFS(${ref('N')},${between('J')})`, v: r2(m.profit), s: S.eur },
      { f: `SUMIFS(${ref('I')},${between('C')})`, v: r2(m.spent), s: S.eur },
    ]);
  }
  return { name: 'Por mês', rows, freezeRow: 1, cols: [14, 18, 18, 18], posNeg: [`C2:C${rows.length}`] };
}

function platformSheet(pl) {
  const { first, last } = pl.range;
  const ref = (c) => `'${PL}'!$${c}$${first}:$${c}$${last}`;
  const rows = [head(['Plataforma', 'Nº vendas', 'Vendas (líquido)', 'Lucro'])];
  for (const [name, m] of byPlatform()) {
    const crit = name === 'Sem plataforma' ? '""' : `"${name.replace(/"/g, '""')}"`;
    const by = `${ref('B')},"Vendido",${ref('K')},${crit}`;
    rows.push([name,
      { f: `COUNTIFS(${by})`, v: m.n, s: S.int },
      { f: `SUMIFS(${ref('L')},${by})-SUMIFS(${ref('M')},${by})`, v: r2(m.sales), s: S.eur },
      { f: `SUMIFS(${ref('N')},${by})`, v: r2(m.profit), s: S.eur }]);
  }
  return { name: 'Plataformas', rows, freezeRow: 1, cols: [18, 12, 18, 14], posNeg: [`D2:D${rows.length}`] };
}

function ordersSheet() {
  const rows = [head(['Encomenda', 'Data', 'Origem', 'Portes/taxas/IVA Eur', 'Repartição', 'Nº artigos', 'Notas'])];
  for (const o of [...state.orders].sort((a, b) => (a.date || '').localeCompare(b.date || ''))) {
    rows.push([o.name, date(o.date), o.source || null, eur(o.extraEur || 0), o.alloc === 'equal' ? 'Igual' : 'Por valor',
      { v: state.items.filter((i) => i.orderId === o.id).length, s: S.int }, o.notes || null]);
  }
  return { name: 'Encomendas', rows, freezeRow: 1, cols: [26, 12, 12, 20, 12, 11, 30] };
}

function collectionSheet() {
  const list = [...state.collection].sort((a, b) => (a.type || '').localeCompare(b.type || '') || a.name.localeCompare(b.name));
  const last = Math.max(4, list.length + 3);
  const rows = [
    [{ v: 'Valor total', s: S.bold }, { f: `SUM(E4:E${last})`, v: r2(collectionValue()), s: S.eurBold }],
    [{ v: 'Peças', s: S.bold }, { f: `SUM(C4:C${last})`, v: list.reduce((s, c) => s + (c.qty || 1), 0), s: S.int }],
    head(['Peça', 'Tipo', 'Quantidade', 'Valor aprox. (cada)', 'Valor total', 'Estado', 'Notas']),
  ];
  list.forEach((c, i) => {
    const r = i + 4;
    rows.push([c.name, TYPES[c.type] || c.type, { v: c.qty || 1, s: S.int }, eur(c.price || 0),
      { f: `C${r}*D${r}`, v: r2((c.price || 0) * (c.qty || 1)), s: S.eur }, c.condition === 'usado' ? 'Usado' : 'Novo', c.notes || null]);
  });
  return { name: 'Coleção', rows, freezeRow: 3, cols: [28, 14, 11, 18, 14, 10, 30] };
}

function reviewSheet() {
  const rows = [head(['Plataforma', 'Venda', 'Valor', 'Motivo'])];
  for (const v of state.inbox) rows.push([v.platform, v.name, eur(v.price || 0), v.reason || null]);
  return { name: 'Por rever', rows, freezeRow: 1, cols: [12, 34, 12, 50] };
}

export function buildWorkbook() {
  const pl = plSheet();
  const sheets = [pl, monthSheet(pl), platformSheet(pl), ordersSheet(), collectionSheet()];
  if (state.inbox.length) sheets.push(reviewSheet());
  return buildXlsx(sheets);
}
