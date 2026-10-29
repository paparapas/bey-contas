import { state, remove, upsert } from '../store.js';
import { STATUS, itemCost, itemProfit } from '../calc.js';
import { icon, eur, signed, cls, esc, on, seg, segTap, swipeRow, actionSheet, toast, haptic, fmtDate } from '../ui.js';
import { registerView, refresh, switchTab } from '../nav.js';
import { openItem } from '../item-sheet.js';

let filter = 'all', query = '', sort = 'recent';
const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'stock', label: 'Em stock' },
  { value: 'sold', label: 'Vendidos' },
  { value: 'kept', label: 'Guardados' },
];
const SORTS = { recent: 'Mais recentes', name: 'Nome', profit: 'Lucro', cost: 'Custo' };
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function visible() {
  const q = norm(query.trim());
  let list = state.items.filter((it) => {
    if (filter === 'kept' ? !(it.status === 'kept' || it.status === 'gifted') : filter !== 'all' && it.status !== filter) return false;
    return !q || norm(`${it.name} ${it.platform || ''} ${it.source || ''} ${it.notes || ''}`).includes(q);
  });
  const by = {
    recent: (a, b) => (b.buyDate || '').localeCompare(a.buyDate || '') || idx(b) - idx(a),
    name: (a, b) => a.name.localeCompare(b.name, 'pt'),
    profit: (a, b) => (itemProfit(b) ?? -1e9) - (itemProfit(a) ?? -1e9),
    cost: (a, b) => itemCost(b) - itemCost(a),
  }[sort];
  return list.sort(by);
}
// Imported rows keep their sheet order (id "x<row>"); newer items come first.
function idx(it) { return it.id.startsWith('x') ? +it.id.slice(1) : 1e6 + (it.updatedAt || 0) / 1e6; }

function right(it) {
  if (it.status === 'sold') {
    const p = itemProfit(it);
    return `<div class="right"><div class="num ${cls(p)}" style="font-weight:600">${signed(p)}</div><div class="sub num">${eur(it.salePrice)}</div></div>`;
  }
  if (it.status === 'stock') {
    return `<div class="right"><div class="num" style="color:var(--label-2)">${it.estPrice ? `≈ ${eur(it.estPrice)}` : '—'}</div><div class="sub"><span class="pill blue">Stock</span></div></div>`;
  }
  return `<div class="right"><span class="pill ${STATUS[it.status].pill}">${STATUS[it.status].label}</span></div>`;
}

function rowHtml(it) {
  const sub = [eur(itemCost(it)), it.platform, it.saleDate ? fmtDate(it.saleDate) : it.buyDate ? fmtDate(it.buyDate) : null].filter(Boolean).join(' · ');
  const row = `<button class="row" data-act="open-item" data-id="${it.id}">
    <div class="body"><div class="title">${it.review ? '<span class="dot" style="background:var(--orange);margin-right:6px;vertical-align:2px"></span>' : ''}${esc(it.name)}</div><div class="sub num">${sub}</div></div>
    ${right(it)}
  </button>`;
  const leading = it.status === 'stock' ? [{ label: 'Vender', icon: 'tag', color: 'var(--green)', act: 'quick-sell', id: it.id }] : [];
  return swipeRow(row, [{ label: 'Apagar', icon: 'trash', color: 'var(--red)', act: 'del-item', id: it.id }], leading);
}

function listHtml() {
  const list = visible();
  if (!list.length) {
    return `<div class="empty-state">${icon('search')}<div class="e-title">${query ? 'Sem resultados' : 'Sem artigos'}</div>${query ? `Nada encontrado para “${esc(query)}”.` : 'Toca em + para adicionar.'}</div>`;
  }
  const cost = list.reduce((s, i) => s + itemCost(i), 0);
  const soldList = list.filter((i) => i.status === 'sold');
  const profit = soldList.reduce((s, i) => s + itemProfit(i), 0);
  return `<div class="section">
    <div class="section-header"><span>${list.length} ${list.length === 1 ? 'artigo' : 'artigos'} · ${eur(cost)}</span>${soldList.length ? `<span class="num ${cls(profit)}" style="text-transform:none">${signed(profit)}</span>` : ''}</div>
    <div class="list">${list.map(rowHtml).join('')}</div>
  </div>`;
}

registerView('artigos', {
  render() {
    return {
      title: 'Artigos',
      right: `<button class="nav-btn" data-act="art-sort" aria-label="Ordenar">${icon('sort')}</button>
              <button class="nav-btn" data-act="new-item" aria-label="Novo artigo">${icon('plus')}</button>`,
      html: `
        <label class="search">${icon('search')}<input type="search" placeholder="Procurar" value="${esc(query)}" data-input="art-search" autocomplete="off"></label>
        ${seg('art-filter', FILTERS, filter)}
        <div id="art-list">${listHtml()}</div>`,
    };
  },
});

on('art-search', (el) => {
  query = el.value;
  const box = el.closest('.screen').querySelector('#art-list');
  box.innerHTML = listHtml();
});
on('art-filter', (el) => { segTap(el); filter = el.dataset.value; setTimeout(refresh, 120); });
on('art-sort', () => actionSheet({
  title: 'Ordenar por',
  buttons: Object.entries(SORTS).map(([k, label]) => ({ label: (k === sort ? '✓ ' : '') + label, action: () => { sort = k; refresh(); } })),
}));
on('del-item', async (el) => {
  const it = state.items.find((i) => i.id === el.dataset.id);
  if (!it) return;
  const snapshot = { ...it };
  remove('items', it.id);
  haptic('heavy');
  toast('Artigo apagado', { icon: 'trash', action: 'Anular', onAction: () => { delete state.deleted[`items:${snapshot.id}`]; upsert('items', snapshot); } });
});
on('quick-sell', (el) => {
  const it = state.items.find((i) => i.id === el.dataset.id);
  if (!it) return;
  openItem(it.id);
  // Pre-fill the sale on the open sheet.
  setTimeout(() => document.querySelector('.sheet.show [data-act="item-status"][data-value="sold"]')?.click(), 60);
});
on('goto-stock', () => { filter = 'stock'; switchTab('artigos'); refresh(); });

