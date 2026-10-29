// Import calculator (old "Calculator ZenMark" sheet): item + shipping + fees,
// VAT on item + international shipping, weight estimate, and "create order".
import { state, upsert } from '../store.js';
import { SOURCES, round2 } from '../calc.js';
import { icon, eur, jpy, esc, on, parseNum, numIn, stepper, haptic, toast, today } from '../ui.js';
import { registerView, refresh, switchTab, go } from '../nav.js';

const WEIGHTS = { bey: { label: 'Bey', g: 220 }, booster: { label: 'Booster', g: 90 }, starter: { label: 'Starter', g: 150 } };
const KEY = 'calc-draft';
let c = { item: null, intl: null, zm: null, dom: null, units: 1, name: '', source: 'ZenMarket', w: { bey: 0, booster: 0, starter: 0 } };
try { c = { ...c, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { /* first run */ }
const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* private mode */ } };

function totals() {
  const rate = state.settings.rate, vatRate = state.settings.vat;
  const item = c.item || 0, intl = c.intl || 0, zm = c.zm || 0, dom = c.dom || 0;
  const vat = (item + intl) * vatRate;
  const total = item + intl + zm + dom + vat;
  return { rate, vatRate, item, intl, zm, dom, vat, total, extra: intl + zm + dom + vat };
}

function resultsHtml() {
  const t = totals();
  const units = Math.max(1, c.units);
  const line = (label, y) => `<div class="kv"><span>${label}</span><span class="num">${jpy(y)} · ${eur(y * t.rate)}</span></div>`;
  return `
    <div class="hero" style="text-align:center">
      <div class="label" style="justify-content:center">Custo total</div>
      <div class="value num">${eur(t.total * t.rate)}</div>
      <div class="meta num">${jpy(t.total)}${units > 1 ? ` · ${eur((t.total * t.rate) / units)} por unidade` : ''}</div>
    </div>
    <div class="section"><div class="list">
      ${line('Artigo', t.item)}
      ${line('Envio internacional', t.intl)}
      ${t.zm ? line('Taxa ZenMarket', t.zm) : ''}
      ${t.dom ? line('Envio doméstico', t.dom) : ''}
      ${line(`IVA ${Math.round(t.vatRate * 100)}%`, t.vat)}
    </div>
    <div class="section-footer">O IVA incide sobre o artigo + envio internacional. Câmbio: 1 € = ${jpy(1 / t.rate)}.</div></div>`;
}

function weightHtml() {
  const total = Object.entries(WEIGHTS).reduce((s, [k, w]) => s + w.g * (c.w[k] || 0), 0);
  return `<div class="section">
    <div class="section-header">Peso estimado</div>
    <div class="list">
      ${Object.entries(WEIGHTS).map(([k, w]) => `<div class="field">
        <span class="f-label">${w.label} <span style="color:var(--label-2);font-size:15px">${w.g} g</span></span>
        <span style="flex:1;text-align:right;font-weight:600" class="num">${c.w[k] || 0}</span>${stepper('calc-w', k, c.w[k])}
      </div>`).join('')}
      <div class="kv total"><span>Total</span><span class="num">${total} g</span></div>
    </div>
    <div class="section-footer">Usa para estimar os portes internacionais antes de comprar.</div>
  </div>`;
}

const money = (k, label, ph = '0') => `<div class="field"><span class="f-label">${label}</span>
  <input inputmode="numeric" placeholder="${ph}" value="${numIn(c[k], 0)}" data-input="calc-f" data-k="${k}"><span class="unit">¥</span></div>`;

registerView('calc', {
  render() {
    return {
      title: 'Calculadora',
      right: `<button class="nav-btn" data-act="calc-clear">Limpar</button>`,
      html: `
        <div id="calc-res">${resultsHtml()}</div>
        <div class="section">
          <div class="section-header">Valores em ienes</div>
          <div class="list">
            ${money('item', 'Preço do artigo')}
            ${money('intl', 'Envio internacional')}
            ${money('zm', 'Taxa ZenMarket')}
            ${money('dom', 'Envio doméstico')}
          </div>
        </div>
        ${weightHtml()}
        <div class="section">
          <div class="section-header">Criar encomenda</div>
          <div class="list">
            <div class="field"><input style="text-align:left" placeholder="Nome do artigo" value="${esc(c.name)}" data-input="calc-name" autocomplete="off"></div>
            <div class="field"><label>Origem</label><select data-change="calc-src">${SOURCES.map((s) => `<option ${s === c.source ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
            <div class="field"><span class="f-label">Unidades</span><span style="flex:1;text-align:right;font-weight:600" class="num">${c.units}</span>${stepper('calc-units', '', c.units)}</div>
          </div>
          <div class="section-footer">Cria a encomenda com os portes, taxas e IVA, e um artigo em stock por unidade.</div>
        </div>
        <div class="pad"><button class="btn" data-act="calc-create">${icon('box')}Criar encomenda</button></div>`,
    };
  },
});

on('calc-f', (el) => {
  c[el.dataset.k] = el.value.trim() === '' ? null : parseNum(el.value);
  keep();
  el.closest('.screen').querySelector('#calc-res').innerHTML = resultsHtml();
});
on('calc-name', (el) => { c.name = el.value; keep(); });
on('calc-src', (el) => { c.source = el.value; keep(); });
on('calc-w', (el) => { c.w[el.dataset.id] = Math.max(0, (c.w[el.dataset.id] || 0) + +el.dataset.d); keep(); haptic(); refresh(); });
on('calc-units', (el) => { c.units = Math.max(1, Math.min(50, c.units + +el.dataset.d)); keep(); haptic(); refresh(); });
on('calc-clear', () => {
  c = { item: null, intl: null, zm: null, dom: null, units: 1, name: '', source: c.source, w: { bey: 0, booster: 0, starter: 0 } };
  keep(); refresh();
});
on('calc-create', () => {
  const t = totals();
  if (!t.item) { toast('Indica o preço do artigo', { icon: 'alert' }); haptic('heavy'); return; }
  if (!c.name.trim()) { toast('Dá um nome ao artigo', { icon: 'alert' }); haptic('heavy'); return; }
  const units = Math.max(1, c.units);
  const order = upsert('orders', {
    name: c.name.trim(), date: today(), source: c.source, alloc: 'value',
    extraEur: round2(t.extra * t.rate), extraJpy: Math.round(t.extra), notes: '',
  }, { silent: true });
  for (let i = 0; i < units; i++) {
    upsert('items', {
      name: c.name.trim(), status: 'stock', costEur: round2((t.item * t.rate) / units), costJpy: Math.round(t.item / units),
      buyDate: today(), source: c.source, orderId: order.id, estPrice: null, salePrice: null, fees: 0,
      platform: null, saleDate: null, notes: '', review: null,
    }, { silent: i < units - 1 });
  }
  haptic('success');
  toast('Encomenda criada', { icon: 'box', action: 'Ver', onAction: () => { switchTab('mais'); go('encomendas'); go('encomenda', { id: order.id }); } });
  c.name = ''; c.units = 1; keep(); refresh();
});
