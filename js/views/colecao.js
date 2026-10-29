// Personal collection: parts picked from the BBPT Hub catalog (or custom ones)
// with an approximate value, plus a dashboard of worth and completion.
import { state, upsert, remove, find } from '../store.js';
import { collectionValue } from '../calc.js';
import { icon, eur, eur0, esc, on, seg, segTap, stepper, haptic, toast, openSheet, parseNum, numIn, confirmDestructive, pct } from '../ui.js';
import { registerView, refresh } from '../nav.js';

export const TYPES = {
  blade: 'Blades', ratchet: 'Ratchets', bit: 'Bits', lockchip: 'Lock Chips',
  assist: 'Assist Blades', metal: 'Metal Blades', over: 'Over Blades', other: 'Outros',
};
const TYPE_COLOR = { blade: 'var(--blue)', ratchet: 'var(--orange)', bit: 'var(--green)', lockchip: 'var(--purple)', assist: 'var(--teal)', metal: 'var(--indigo)', over: 'var(--pink)', other: 'var(--label-2)' };
const PRICE_CHIPS = [2, 5, 8, 10, 15, 20, 30, 50];
const CONDITIONS = [{ value: 'novo', label: 'Novo' }, { value: 'usado', label: 'Usado' }];

let catalog = [];
let mode = 'mine', typeFilter = 'all', query = '';
const TYPE_ORDER = Object.keys(TYPES);
fetch('data/parts.json').then((r) => r.json()).then((list) => {
  catalog = list.sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || (a.line || '').localeCompare(b.line || '') || a.name.localeCompare(b.name, 'pt', { numeric: true }));
  refresh();
}).catch(() => {});

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const partById = (id) => catalog.find((p) => p.id === id);
const ownedQty = (partId) => state.collection.filter((c) => c.partId === partId).reduce((s, c) => s + (c.qty || 1), 0);

function img(entryOrPart, size = 72) {
  const src = entryOrPart.img || partById(entryOrPart.partId)?.img;
  return src ? `<img src="${src}" alt="" loading="lazy" decoding="async" style="width:${size}px;height:${size}px">` : `<div class="ph" style="width:${size}px;height:${size}px">${icon('star')}</div>`;
}

function ring(p, color = 'var(--purple)') {
  const r = 37, C = 2 * Math.PI * r;
  return `<svg class="ring" viewBox="0 0 84 84"><circle class="track" cx="42" cy="42" r="${r}"/>
    <circle class="prog" cx="42" cy="42" r="${r}" stroke="${color}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - p)}"/>
    <text x="42" y="47" text-anchor="middle" style="font:700 17px var(--font-round);fill:var(--label)">${p > 0 && p < 0.1 ? `${(p * 100).toFixed(1).replace('.', ',')}%` : pct(p)}</text></svg>`;
}

function dashboard() {
  const value = collectionValue();
  const pieces = state.collection.reduce((s, c) => s + (c.qty || 1), 0);
  const uniqueIds = new Set(state.collection.filter((c) => c.partId).map((c) => c.partId));
  const completion = catalog.length ? uniqueIds.size / catalog.length : 0;
  const byType = Object.keys(TYPES).map((t) => {
    const inCat = catalog.filter((p) => p.type === t).length;
    const owned = new Set(state.collection.filter((c) => c.type === t && c.partId).map((c) => c.partId)).size;
    const val = state.collection.filter((c) => c.type === t).reduce((s, c) => s + (c.price || 0) * (c.qty || 1), 0);
    const n = state.collection.filter((c) => c.type === t).reduce((s, c) => s + (c.qty || 1), 0);
    return { t, inCat, owned, val, n };
  }).filter((x) => x.inCat || x.n);
  const top = [...state.collection].sort((a, b) => (b.price || 0) - (a.price || 0)).slice(0, 5).filter((c) => c.price);

  return `
    <div class="hero">
      <div class="glow" style="background:var(--purple)"></div>
      <div class="ring-wrap">
        ${ring(completion)}
        <div style="min-width:0">
          <div class="label">Valor da coleção</div>
          <div class="value num" style="font-size:36px">${eur0(value)}</div>
          <div class="meta num">${pieces} peças · ${uniqueIds.size} de ${catalog.length} do catálogo</div>
        </div>
      </div>
    </div>
    <div class="section"><div class="chart"><div class="bars-h">
      ${byType.map((x, i) => `<div class="bar-h">
        <div class="bar-top"><span>${TYPES[x.t]}</span><span class="num">${x.inCat ? `${x.owned}/${x.inCat}` : x.n} · ${eur0(x.val)}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${x.inCat ? (x.owned / x.inCat) * 100 : 100}%;background:${TYPE_COLOR[x.t]};animation-delay:${i * 0.05}s"></div></div>
      </div>`).join('')}
    </div></div></div>
    ${top.length ? `<div class="section"><div class="section-header big">Mais valiosas</div><div class="list">
      ${top.map((c) => `<button class="row" data-act="coll-edit" data-id="${c.id}" style="--inset:72px">
        <span class="thumb" style="display:grid;place-items:center;overflow:hidden">${img(c, 40)}</span>
        <div class="body"><div class="title">${esc(c.name)}</div><div class="sub">${TYPES[c.type]}${c.qty > 1 ? ` · ×${c.qty}` : ''}</div></div>
        <div class="right num" style="font-weight:600">${eur(c.price * (c.qty || 1))}</div></button>`).join('')}
    </div></div>` : ''}`;
}

function mineHtml() {
  const q = norm(query.trim());
  const list = state.collection.filter((c) => (typeFilter === 'all' || c.type === typeFilter) && (!q || norm(c.name).includes(q)));
  if (!state.collection.length) {
    return `<div class="empty-state">${icon('star')}<div class="e-title">Coleção vazia</div>Abre o catálogo e toca numa peça para a adicionares.</div>
      <div class="pad"><button class="btn" data-act="coll-mode" data-value="catalog">Abrir catálogo</button></div>`;
  }
  if (!list.length) return `<div class="empty-state">Sem peças para este filtro.</div>`;
  return `<div class="part-grid">${list.sort((a, b) => a.name.localeCompare(b.name)).map((c) => `
    <button class="part-cell" data-act="coll-edit" data-id="${c.id}">
      ${c.qty > 1 ? `<span class="owned">×${c.qty}</span>` : ''}
      ${img(c)}<div class="p-name">${esc(c.name)}</div>
      <div class="num" style="font-size:12px;color:var(--label-2)">${c.price ? eur(c.price) : '—'}${c.condition === 'usado' ? ' · usado' : ''}</div>
    </button>`).join('')}</div>`;
}

function catalogHtml() {
  const q = norm(query.trim());
  const list = catalog.filter((p) => (typeFilter === 'all' || p.type === typeFilter) && (!q || norm(p.name).includes(q)));
  return `<div class="part-grid">
    ${list.map((p) => {
      const n = ownedQty(p.id);
      return `<button class="part-cell ${n ? '' : 'dim'}" data-act="coll-add" data-id="${p.id}">
        ${n ? `<span class="owned">${n}</span>` : ''}
        ${img(p)}<div class="p-name">${esc(p.name)}</div>
        <div style="font-size:11px;color:var(--label-2)">${p.line || TYPES[p.type]}</div>
      </button>`;
    }).join('')}
    <button class="part-cell" data-act="coll-custom"><div class="ph">${icon('plus')}</div><div class="p-name">Peça personalizada</div><div style="font-size:11px">&nbsp;</div></button>
  </div>`;
}

function bodyHtml() { return mode === 'mine' ? mineHtml() : catalogHtml(); }

registerView('colecao', {
  render() {
    const types = ['all', ...Object.keys(TYPES).filter((t) => t !== 'other' || state.collection.some((c) => c.type === 'other'))];
    return {
      title: 'Coleção',
      right: `<button class="nav-btn" data-act="coll-mode" data-value="catalog" aria-label="Adicionar peça">${icon('plus')}</button>`,
      html: `
        ${mode === 'mine' ? dashboard() : ''}
        ${seg('coll-mode', [{ value: 'mine', label: 'A minha coleção' }, { value: 'catalog', label: 'Catálogo' }], mode)}
        <label class="search">${icon('search')}<input type="search" placeholder="${mode === 'mine' ? 'Procurar na coleção' : 'Procurar no catálogo'}" value="${esc(query)}" data-input="coll-search" autocomplete="off"></label>
        <div class="chips">${types.map((t) => `<button class="chip ${t === typeFilter ? 'on' : ''}" data-act="coll-type" data-value="${t}">${t === 'all' ? 'Tudo' : TYPES[t]}</button>`).join('')}</div>
        <div id="coll-body">${bodyHtml()}</div>`,
    };
  },
});

on('coll-mode', (el) => {
  if (el.closest('.seg')) segTap(el);
  mode = el.dataset.value; query = '';
  setTimeout(refresh, el.closest('.seg') ? 120 : 0);
});
on('coll-type', (el) => { typeFilter = el.dataset.value; haptic(); refresh(); });
on('coll-search', (el) => { query = el.value; el.closest('.screen').querySelector('#coll-body').innerHTML = bodyHtml(); });

// ---------- Part sheet ----------
let d = null;
function partSheet(entry, isNew) {
  d = { ...entry };
  const sheet = openSheet({
    title: isNew ? 'Adicionar peça' : 'Peça',
    size: 'medium',
    left: { label: 'Cancelar' },
    right: { label: isNew ? 'Adicionar' : 'Guardar', bold: true, action: (sh) => {
      if (!d.name?.trim()) { toast('Dá um nome à peça', { icon: 'alert' }); return; }
      d.name = d.name.trim();
      upsert('collection', d);
      haptic('success');
      toast(isNew ? `${d.name} adicionado à coleção` : 'Guardado', { icon: 'star' });
      sh.close();
    } },
    render: () => `
      <div style="display:grid;place-items:center;padding:0 0 14px">${img(d, 120)}</div>
      <div class="section"><div class="list">
        ${d.partId ? `<div class="kv"><span>Peça</span><span style="font-weight:600">${esc(d.name)}</span></div>
          <div class="kv"><span>Tipo</span><span>${TYPES[d.type]}${partById(d.partId)?.line ? ` · ${partById(d.partId).line}` : ''}</span></div>`
        : `<div class="field"><input style="text-align:left" placeholder="Nome da peça" value="${esc(d.name)}" data-input="part-f" data-k="name"></div>
          <div class="field"><label>Tipo</label><select data-change="part-f" data-k="type">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${k === d.type ? 'selected' : ''}>${v}</option>`).join('')}</select></div>`}
        <div class="field"><span class="f-label">Quantidade</span><span style="flex:1;text-align:right;font-weight:600" class="num" id="part-qty">${d.qty}</span>${stepper('part-qty', '', d.qty)}</div>
        <div class="field"><span class="f-label">Valor aprox. (cada)</span><input inputmode="decimal" placeholder="0,00" value="${numIn(d.price)}" data-input="part-f" data-k="price" id="part-price"><span class="unit">€</span></div>
      </div></div>
      <div class="chips">${PRICE_CHIPS.map((p) => `<button class="chip ${d.price === p ? 'on' : ''}" data-act="part-price" data-value="${p}">${p} €</button>`).join('')}</div>
      <div style="height:16px"></div>
      ${seg('part-cond', CONDITIONS, d.condition || 'novo')}
      <div class="section"><div class="list"><div class="field stack"><textarea rows="2" placeholder="Notas (cor, edição, onde está…)" data-input="part-f" data-k="notes">${esc(d.notes || '')}</textarea></div></div></div>
      ${!isNew ? `<div class="section"><div class="list"><button class="row danger" data-act="part-del">Remover da coleção</button></div></div>` : ''}`,
  });
  partSheet.current = sheet;
}

on('coll-add', (el) => {
  const p = partById(el.dataset.id);
  if (!p) return;
  const existing = state.collection.find((c) => c.partId === p.id);
  if (existing) { partSheet(existing, false); return; }
  partSheet({ partId: p.id, name: p.name, type: p.type, qty: 1, price: null, condition: 'novo', notes: '' }, true);
});
on('coll-custom', () => partSheet({ partId: null, name: '', type: 'other', qty: 1, price: null, condition: 'novo', notes: '' }, true));
on('coll-edit', (el) => { const c = find('collection', el.dataset.id); if (c) partSheet(c, false); });
on('part-f', (el) => { d[el.dataset.k] = el.dataset.k === 'price' ? (el.value.trim() ? parseNum(el.value) : null) : el.value; });
on('part-qty', (el) => {
  d.qty = Math.max(1, Math.min(99, (d.qty || 1) + +el.dataset.d));
  partSheet.current.body.querySelector('#part-qty').textContent = d.qty;
  haptic();
});
on('part-price', (el) => { d.price = +el.dataset.value; haptic(); partSheet.current.update(); });
on('part-cond', (el) => { segTap(el); d.condition = el.dataset.value; });
on('part-del', async () => {
  if (!(await confirmDestructive(d.name, 'Remover da coleção'))) return;
  remove('collection', d.id);
  partSheet.current.close();
  toast('Removido da coleção', { icon: 'trash' });
});
