// Money maths: item cost (incl. its share of the order's extra costs),
// profits and the dashboard figures.
import { state } from './store.js';

export const STATUS = {
  stock: { label: 'Em stock', pill: 'blue' },
  sold: { label: 'Vendido', pill: 'green' },
  kept: { label: 'Guardado', pill: 'purple' },
  gifted: { label: 'Oferta', pill: 'orange' },
};
export const PLATFORMS = ['Vinted', 'Wallapop', 'OLX', 'Em mão', 'Torneio', 'Outro'];
export const SOURCES = ['Amazon JP', 'ZenMarket', 'Loja', 'Vinted', 'Wallapop', 'Outro'];

export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Extra cost of an order (shipping, fees, customs, VAT) spread over its items. */
export function orderShare(item) {
  if (!item.orderId) return 0;
  const order = state.orders.find((o) => o.id === item.orderId);
  if (!order || !order.extraEur) return 0;
  const members = state.items.filter((i) => i.orderId === order.id);
  if (!members.length) return 0;
  if (order.alloc === 'value') {
    const total = members.reduce((s, i) => s + (i.costEur || 0), 0);
    if (total > 0) return (order.extraEur * (item.costEur || 0)) / total;
  }
  return order.extraEur / members.length;
}

export const itemCost = (it) => (it.costEur || 0) + orderShare(it);
export const itemNet = (it) => (it.salePrice || 0) - (it.fees || 0);
export const itemProfit = (it) => (it.status === 'sold' ? itemNet(it) - itemCost(it) : null);

export function orderTotals(order) {
  const members = state.items.filter((i) => i.orderId === order.id);
  const base = members.reduce((s, i) => s + (i.costEur || 0), 0);
  return { members, base, total: base + (order.extraEur || 0) };
}

/** Traffic light used by the spreadsheet: ≥0, down to −250, −250…−500, below −500. */
export function level(v) {
  if (v >= 0) return 'good';
  if (v >= -250) return 'ok';
  if (v >= -500) return 'warn';
  return 'bad';
}

export function collectionValue() {
  return state.collection.reduce((s, c) => s + (c.price || 0) * (c.qty || 1), 0);
}

export function kpis() {
  const items = state.items;
  let spent = 0, sales = 0, stockValue = 0, stockCost = 0, keptCost = 0;
  let sold = 0, inStock = 0, kept = 0, noEstimate = 0;
  for (const it of items) {
    const cost = itemCost(it);
    spent += cost;
    if (it.status === 'sold') { sales += itemNet(it); sold++; }
    else if (it.status === 'stock') {
      inStock++; stockCost += cost;
      if (it.estPrice) stockValue += it.estPrice; else noEstimate++;
    } else if (it.status === 'kept') { kept++; keptCost += cost; }
  }
  const realized = sales - spent;
  const predicted = realized + stockValue;
  const coll = collectionValue();
  const soldItems = items.filter((i) => i.status === 'sold');
  const soldProfit = soldItems.reduce((s, i) => s + itemProfit(i), 0);
  return {
    spent, sales, realized, stockValue, stockCost, keptCost, predicted, coll,
    position: predicted + coll,
    sold, inStock, kept, noEstimate,
    avgProfit: sold ? soldProfit / sold : 0,
    winRate: sold ? soldItems.filter((i) => itemProfit(i) > 0).length / sold : 0,
  };
}

/** [['YYYY-MM', { sales, profit, spent, n (sales), nb (purchases) }], …] for every month from the first to the last with data (empty months included). */
export function monthly() {
  const map = new Map();
  const get = (k) => { if (!map.has(k)) map.set(k, { sales: 0, profit: 0, spent: 0, n: 0, nb: 0 }); return map.get(k); };
  for (const it of state.items) {
    if (it.status === 'sold' && it.saleDate) {
      const m = get(it.saleDate.slice(0, 7));
      m.sales += itemNet(it); m.profit += itemProfit(it); m.n++;
    }
    if (it.buyDate) { const m = get(it.buyDate.slice(0, 7)); m.spent += itemCost(it); m.nb++; }
  }
  const keys = [...map.keys()].sort();
  if (!keys.length) return [];
  const out = [];
  let [y, mo] = keys[0].split('-').map(Number);
  const end = keys[keys.length - 1];
  for (;;) {
    const k = `${y}-${String(mo).padStart(2, '0')}`;
    out.push([k, map.get(k) || { sales: 0, profit: 0, spent: 0, n: 0, nb: 0 }]);
    if (k >= end) break;
    if (++mo > 12) { mo = 1; y++; }
  }
  return out;
}

/** Items sold (or bought) in month 'YYYY-MM'. */
export const soldInMonth = (ym) => state.items.filter((i) => i.status === 'sold' && i.saleDate?.startsWith(ym));
export const boughtInMonth = (ym) => state.items.filter((i) => i.buyDate?.startsWith(ym));

export function byPlatform() {
  const map = new Map();
  for (const it of state.items) {
    if (it.status !== 'sold') continue;
    const k = it.platform || 'Sem plataforma';
    const m = map.get(k) || { n: 0, sales: 0, profit: 0 };
    m.n++; m.sales += itemNet(it); m.profit += itemProfit(it);
    map.set(k, m);
  }
  return [...map.entries()].sort((a, b) => b[1].sales - a[1].sales);
}

export const reviewCount = () => state.items.filter((i) => i.review).length + state.inbox.length;
