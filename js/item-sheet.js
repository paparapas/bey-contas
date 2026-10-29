// Create / edit one item (unit) in a bottom sheet.
import { state, upsert, remove, find } from './store.js';
import { STATUS, PLATFORMS, SOURCES, orderShare, round2 } from './calc.js';
import { openSheet, on, esc, eur, signed, cls, jpy, parseNum, numIn, seg, segTap, today, confirmDestructive, toast, haptic, stepper, icon } from './ui.js';

let draft = null, sheet = null, isNew = false, qty = 1;

export function openItem(id, preset = {}) {
  const src = id ? find('items', id) : null;
  isNew = !src;
  qty = 1;
  draft = src ? { ...src } : {
    name: '', status: 'stock', costEur: null, costJpy: null, buyDate: today(), source: 'Amazon JP',
    orderId: null, estPrice: null, salePrice: null, fees: 0, platform: null, saleDate: null, notes: '', review: null,
    ...preset,
  };
  draft._cur = draft.costJpy && !src?.costEur ? 'JPY' : (preset._cur || 'EUR');
  sheet = openSheet({
    title: isNew ? 'Novo artigo' : 'Artigo',
    left: { label: 'Cancelar' },
    right: { label: isNew ? 'Adicionar' : 'Guardar', bold: true, action: save },
    render,
  });
}

function summary() {
  const cost = (draft.costEur || 0) + (draft.id ? orderShare(draft) : 0);
  if (draft.status === 'sold') {
    const p = (draft.salePrice || 0) - (draft.fees || 0) - cost;
    return { value: signed(p), cls: cls(p), label: 'Lucro desta venda' };
  }
  if (draft.status === 'stock' && draft.estPrice) {
    const p = draft.estPrice - cost;
    return { value: signed(p), cls: cls(p), label: 'Margem prevista' };
  }
  return { value: eur(cost), cls: '', label: draft.status === 'kept' ? 'Custo do artigo guardado' : 'Custo do artigo' };
}
const summaryHtml = () => { const s = summary(); return `<div class="sh-value num ${s.cls}">${s.value}</div><div class="sh-label">${s.label}</div>`; };

function convText() {
  if (draft._cur === 'JPY') return eur(draft.costEur);
  return jpy(draft.costJpy ?? (draft.costEur || 0) / state.settings.rate);
}

function render() {
  const d = draft;
  const rate = state.settings.rate;
  const costField = d._cur === 'JPY'
    ? `<input inputmode="decimal" placeholder="0" value="${numIn(d.costJpy, 0)}" data-input="item-f" data-k="costJpy"><span class="unit">¥</span>`
    : `<input inputmode="decimal" placeholder="0,00" value="${numIn(d.costEur)}" data-input="item-f" data-k="costEur"><span class="unit">€</span>`;
  const conv = convText();
  const share = d.id ? orderShare(d) : 0;
  return `
    <div class="sheet-hero" id="item-summary">${summaryHtml()}</div>
    ${d.review ? `<div class="banner" style="background:color-mix(in srgb,var(--orange) 14%,var(--card))"><div class="icon-box" style="background:var(--orange)">${icon('alert')}</div><div><div class="b-title">A rever</div><div class="b-sub">${esc(d.review)}</div></div></div>` : ''}
    <div class="section"><div class="list">
      <div class="field big"><input placeholder="Nome do artigo" value="${esc(d.name)}" data-input="item-f" data-k="name" autocomplete="off"></div>
    </div></div>
    ${seg('item-status', Object.entries(STATUS).map(([value, s]) => ({ value, label: s.label })), d.status)}

    <div class="section">
      <div class="section-header">Compra</div>
      <div class="list">
        <div class="field"><span class="f-label">Custo</span>${costField}</div>
        <div class="field"><span class="f-label" style="color:var(--label-2)">${d._cur === 'JPY' ? 'Em euros' : 'Em ienes'}</span><span style="flex:1;text-align:right;color:var(--label-2)" class="num" id="item-conv">${conv}</span>
          <button class="mini-btn" data-act="item-cur">Usar ${d._cur === 'JPY' ? '€' : '¥'}</button></div>
        <div class="field"><label>Data</label><input type="date" value="${d.buyDate || ''}" data-change="item-f" data-k="buyDate"></div>
        <div class="field"><label>Origem</label>
          <select data-change="item-f" data-k="source">${['', ...SOURCES].map((s) => `<option value="${s}" ${s === (d.source || '') ? 'selected' : ''}>${s || '—'}</option>`).join('')}</select></div>
        ${state.orders.length ? `<div class="field"><label>Encomenda</label>
          <select data-change="item-f" data-k="orderId"><option value="">Nenhuma</option>${state.orders.map((o) => `<option value="${o.id}" ${o.id === d.orderId ? 'selected' : ''}>${esc(o.name)}</option>`).join('')}</select></div>` : ''}
        ${isNew ? `<div class="field"><span class="f-label">Unidades</span><span style="flex:1;text-align:right;font-weight:600" id="item-qty">${qty}</span>${stepper('item-qty', '', qty)}</div>` : ''}
      </div>
      <div class="section-footer">Câmbio atual: 1 € = ${jpy(1 / rate)}.${share ? ` Inclui ${eur(share)} de portes/taxas da encomenda.` : ''}${isNew ? ' Com várias unidades é criado um artigo por unidade.' : ''}</div>
    </div>

    ${d.status === 'stock' ? `
    <div class="section">
      <div class="section-header">Previsão</div>
      <div class="list">
        <div class="field"><span class="f-label">Preço previsto</span><input inputmode="decimal" placeholder="0,00" value="${numIn(d.estPrice)}" data-input="item-f" data-k="estPrice"><span class="unit">€</span></div>
      </div>
      <div class="section-footer">Quanto achas que vale / vais pedir. Conta para o valor em stock e o resultado previsto.</div>
    </div>` : ''}

    ${d.status === 'sold' ? `
    <div class="section">
      <div class="section-header">Venda</div>
      <div class="list">
        <div class="field"><span class="f-label">Preço de venda</span><input inputmode="decimal" placeholder="0,00" value="${numIn(d.salePrice)}" data-input="item-f" data-k="salePrice"><span class="unit">€</span></div>
        <div class="field"><span class="f-label">Taxas / portes</span><input inputmode="decimal" placeholder="0,00" value="${numIn(d.fees)}" data-input="item-f" data-k="fees"><span class="unit">€</span></div>
        <div class="field"><label>Data</label><input type="date" value="${d.saleDate || ''}" data-change="item-f" data-k="saleDate"></div>
      </div>
    </div>
    <div class="chips">${PLATFORMS.map((p) => `<button class="chip ${p === d.platform ? 'on' : ''}" data-act="item-plat" data-value="${p}">${p}</button>`).join('')}</div>
    <div style="height:20px"></div>` : ''}

    <div class="section">
      <div class="section-header">Notas</div>
      <div class="list"><div class="field stack"><textarea rows="3" placeholder="Estado, comprador, etc." data-input="item-f" data-k="notes">${esc(d.notes || '')}</textarea></div></div>
    </div>

    ${!isNew ? `
    <div class="section"><div class="list">
      <button class="row action" data-act="item-dup">${icon('copy')}<span>Duplicar artigo</span></button>
      <button class="row danger" data-act="item-del">Apagar artigo</button>
    </div></div>` : ''}`;
}

const NUM = new Set(['costEur', 'costJpy', 'estPrice', 'salePrice', 'fees']);
function setField(el) {
  const k = el.dataset.k;
  let v = el.value;
  if (NUM.has(k)) v = v.trim() === '' ? null : parseNum(v);
  draft[k] = v === '' ? null : v;
  const rate = state.settings.rate;
  if (k === 'costJpy') draft.costEur = draft.costJpy == null ? null : round2(draft.costJpy * rate);
  if (k === 'costEur') draft.costJpy = draft.costEur == null ? null : Math.round(draft.costEur / rate);
  const conv = sheet.body.querySelector('#item-conv');
  if (conv) conv.textContent = convText();
  sheet.body.querySelector('#item-summary').innerHTML = summaryHtml();
}
on('item-f', setField);

on('item-status', (el) => {
  segTap(el);
  draft.status = el.dataset.value;
  if (draft.status === 'sold' && !draft.saleDate) draft.saleDate = today();
  if (draft.status === 'sold' && !draft.salePrice && draft.estPrice) draft.salePrice = draft.estPrice;
  setTimeout(() => sheet.update(), 160);
});
on('item-cur', () => { draft._cur = draft._cur === 'JPY' ? 'EUR' : 'JPY'; sheet.update(); });
on('item-plat', (el) => { draft.platform = draft.platform === el.dataset.value ? null : el.dataset.value; haptic(); sheet.update(); });
on('item-qty', (el) => {
  qty = Math.max(1, Math.min(50, qty + +el.dataset.d));
  sheet.body.querySelector('#item-qty').textContent = qty;
  haptic();
});

function clean(d) {
  const o = { ...d };
  delete o._cur;
  delete o._inbox;
  if (o.status !== 'sold') { o.salePrice = null; o.saleDate = null; o.platform = null; o.fees = 0; }
  if (o.status !== 'stock' && o.status !== 'sold') o.estPrice = null;
  o.review = null; // saved by hand = reviewed
  return o;
}

function save(sh) {
  if (!draft.name?.trim()) { toast('Dá um nome ao artigo', { icon: 'alert' }); haptic('heavy'); return; }
  draft.name = draft.name.trim();
  if (draft._inbox) remove('inbox', draft._inbox, { silent: true }); // created from a "Rever" platform sale
  if (isNew && qty > 1) {
    for (let i = 0; i < qty; i++) upsert('items', clean({ ...draft, id: undefined }), { silent: i < qty - 1 });
    toast(`${qty} artigos adicionados`);
  } else {
    upsert('items', clean(draft));
    toast(isNew ? 'Artigo adicionado' : 'Guardado');
  }
  haptic('success');
  sh.close();
}

on('item-del', async () => {
  if (!(await confirmDestructive(draft.name, 'Apagar artigo', 'Esta ação não pode ser anulada.'))) return;
  remove('items', draft.id);
  sheet.close();
  toast('Artigo apagado', { icon: 'trash' });
});
on('item-dup', () => {
  const copy = clean({ ...draft, id: undefined });
  upsert('items', copy);
  sheet.close();
  toast('Artigo duplicado');
});
