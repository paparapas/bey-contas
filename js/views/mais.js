// "Mais" tab: orders, review inbox, exchange rate / VAT, backup & sync.
import { state, upsert, remove, find, exportData, merge, setSettings, wipe, commit } from '../store.js';
import { orderTotals, orderShare, itemCost, reviewCount, SOURCES, round2 } from '../calc.js';
import { icon, eur, jpy, esc, on, seg, segTap, openSheet, toast, haptic, actionSheet, confirmDestructive, shareFile, pickFile, parseNum, numIn, fmtDate, today, ago } from '../ui.js';
import { registerView, go, back, refresh, switchTab } from '../nav.js';
import { openItem } from '../item-sheet.js';
import { APP_VERSION, CHANGELOG } from '../version.js';
import { measure } from '../viewport.js';
import { migrateStockRule, applyDates } from '../migrations.js';

const iconBox = (name, color) => `<span class="icon-box" style="background:${color}">${icon(name)}</span>`;
const navRow = (act, ic, color, title, detail = '', extra = '') => `<button class="row" data-act="${act}" ${extra} style="--inset:57px">
  ${iconBox(ic, color)}<div class="body"><div class="title">${title}</div></div>
  ${detail ? `<span class="detail">${detail}</span>` : ''}${icon('chevR', 'chev')}</button>`;

// ---------- Mais ----------
registerView('mais', {
  render() {
    const n = reviewCount();
    return {
      title: 'Mais',
      html: `
        <div class="section"><div class="list">
          ${navRow('goto', 'box', 'var(--orange)', 'Encomendas', String(state.orders.length || ''), 'data-view="encomendas"')}
          ${navRow('goto', 'alert', 'var(--red)', 'Rever', n ? `<span class="pill red">${n}</span>` : '', 'data-view="rever"')}
        </div></div>
        <div class="section"><div class="list">
          ${navRow('goto', 'yen', 'var(--green)', 'Câmbio e IVA', `1 € = ${jpy(1 / state.settings.rate)}`, 'data-view="cambio"')}
          ${navRow('goto', 'share', 'var(--blue)', 'Dados e sincronização', ago(state.settings.lastBackup), 'data-view="dados"')}
        </div></div>
        <div class="section"><div class="list">
          ${navRow('goto', 'sparkle', 'var(--indigo)', 'Versão', APP_VERSION, 'data-view="novidades"')}
        </div></div>
        <div class="section-footer" style="text-align:center;padding-top:0">Bey Contas · os dados ficam neste dispositivo.<br>Catálogo de peças: BBPT Hub.</div>`,
    };
  },
});
on('goto', (el) => go(el.dataset.view));

// ---------- Screen diagnostics ----------
/** Banner shown when this install still has the iOS 26 short-screen problem. */
export function reinstallBanner() {
  if (!measure().needsReinstall) return '';
  return `<button class="banner" data-act="goto-novidades" style="background:color-mix(in srgb,var(--orange) 14%,var(--card))">
    <div class="icon-box" style="background:var(--orange)">${icon('refresh')}</div>
    <div style="flex:1"><div class="b-title">Volta a instalar a app</div><div class="b-sub">Para a barra de baixo encostar ao fundo do ecrã. Faz primeiro uma cópia dos dados.</div></div>
    ${icon('chevR', 'chev')}</button>`;
}
on('goto-novidades', () => { switchTab('mais'); go('novidades'); });

function screenSection() {
  const m = measure();
  const kv = (k, v) => `<div class="kv"><span>${k}</span><span class="num">${esc(String(v))}</span></div>`;
  return `
    ${m.needsReinstall ? `<div class="section">
      <div class="section-header">Voltar a instalar</div>
      <div class="list"><div class="kv" style="display:block;color:var(--label);line-height:1.4">
        Esta instalação foi feita com uma definição que, no iOS 26, deixa uma faixa vazia no fundo do ecrã. Para corrigir:<br>
        1. Mais › Dados › <b>Partilhar cópia</b> e guarda o ficheiro (ex.: Ficheiros).<br>
        2. Mantém o ícone premido › <b>Remover app</b> (apaga os dados desta instalação).<br>
        3. No Safari, abre o site › Partilhar › <b>Adicionar ao ecrã principal</b>.<br>
        4. Na app nova: Mais › Dados › <b>Importar cópia</b>.
      </div></div></div>` : ''}
    <div class="section">
      <div class="section-header">Diagnóstico do ecrã</div>
      <div class="list">
        ${kv('App instalada', m.standalone ? 'sim' : 'não')}
        ${kv('Ecrã', m.screen)}
        ${kv('Janela', m.inner)}
        ${kv('Área visível', m.visual ?? '—')}
        ${kv('Fundo da app', m.fixedBottom)}
        ${kv('Margem topo / fundo', `${m.insetTop} / ${m.insetBottom}`)}
        ${kv('Faixa em falta', m.shortBy)}
      </div>
      <div class="section-footer">Se algo estiver mal no ecrã, envia uma captura desta secção.</div>
    </div>`;
}

// ---------- Novidades (version history) ----------
registerView('novidades', {
  render() {
    return {
      title: 'Novidades',
      html: `
        <div class="hero" style="text-align:center"><div class="label" style="justify-content:center">Versão instalada</div>
          <div class="value num">${APP_VERSION}</div></div>
        ${screenSection()}
        ${CHANGELOG.map((c) => `<div class="section">
          <div class="section-header"><span>Versão ${c.version}</span><span style="text-transform:none">${fmtDate(c.date)}</span></div>
          <div class="list">${c.notes.map((n) => `<div class="kv"><span style="color:var(--label)">${esc(n)}</span></div>`).join('')}</div>
        </div>`).join('')}`,
    };
  },
});
on('nav-back', () => back());

// ---------- Encomendas ----------
registerView('encomendas', {
  render() {
    const orders = [...state.orders].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return {
      title: 'Encomendas',
      right: `<button class="nav-btn" data-act="order-new" aria-label="Nova encomenda">${icon('plus')}</button>`,
      html: orders.length ? `
        <div class="section"><div class="list">
          ${orders.map((o) => { const t = orderTotals(o); return `<button class="row" data-act="order-open" data-id="${o.id}">
            <div class="body"><div class="title">${esc(o.name)}</div><div class="sub">${[fmtDate(o.date), o.source, `${t.members.length} ${t.members.length === 1 ? 'artigo' : 'artigos'}`].filter(Boolean).join(' · ')}</div></div>
            <span class="detail num">${eur(t.total)}</span>${icon('chevR', 'chev')}</button>`; }).join('')}
        </div>
        <div class="section-footer">Os portes, taxas, alfândega e IVA de cada encomenda são repartidos pelos artigos.</div></div>`
        : `<div class="empty-state">${icon('box')}<div class="e-title">Sem encomendas</div>Agrupa compras que partilham portes, taxas e IVA. Também podes criar uma na Calculadora.</div>
           <div class="pad"><button class="btn" data-act="order-new">${icon('plus')}Nova encomenda</button></div>`,
    };
  },
});
on('order-open', (el) => go('encomenda', { id: el.dataset.id }));
on('order-new', () => orderSheet(null));

registerView('encomenda', {
  render({ id }) {
    const o = find('orders', id);
    if (!o) return { title: 'Encomenda', large: false, html: '<div class="empty-state">Encomenda apagada.</div>' };
    const t = orderTotals(o);
    return {
      title: o.name,
      right: `<button class="nav-btn" data-act="order-edit" data-id="${o.id}">Editar</button>`,
      html: `
        <div class="subtitle-top">${[fmtDate(o.date), o.source].filter(Boolean).join(' · ')}</div>
        <div class="hero"><div class="label">Total da encomenda</div><div class="value num">${eur(t.total)}</div>
          <div class="meta num">Artigos ${eur(t.base)} · Portes/taxas/IVA ${eur(o.extraEur)}</div></div>
        ${seg('order-alloc', [{ value: 'value', label: 'Repartir por valor' }, { value: 'equal', label: 'Repartir igual' }], o.alloc || 'value')}
        <div class="section"><div class="section-header">Artigos</div><div class="list">
          ${t.members.map((it) => `<button class="row" data-act="open-item" data-id="${it.id}">
            <div class="body"><div class="title">${esc(it.name)}</div><div class="sub num">${eur(it.costEur)} + ${eur(orderShare(it))}</div></div>
            <span class="detail num" style="color:var(--label)">${eur(itemCost(it))}</span></button>`).join('')}
          <button class="row action" data-act="order-add-item" data-id="${o.id}">${icon('plus')}<span>Adicionar artigo</span></button>
        </div></div>
        ${o.notes ? `<div class="section"><div class="section-header">Notas</div><div class="list"><div class="kv"><span style="color:var(--label)">${esc(o.notes)}</span></div></div></div>` : ''}`,
    };
  },
});
on('order-alloc', (el) => {
  segTap(el);
  const o = find('orders', el.closest('.screen').querySelector('[data-act="order-edit"]').dataset.id);
  o.alloc = el.dataset.value;
  setTimeout(() => upsert('orders', o), 150);
});
on('order-add-item', (el) => {
  const o = find('orders', el.dataset.id);
  openItem(null, { orderId: o.id, source: o.source, buyDate: o.date });
});
on('order-edit', (el) => orderSheet(el.dataset.id));

let od = null;
function orderSheet(id) {
  const src = id ? find('orders', id) : null;
  od = src ? { ...src } : { name: '', date: today(), source: 'ZenMarket', extraEur: null, extraJpy: null, alloc: 'value', notes: '' };
  openSheet({
    title: src ? 'Editar encomenda' : 'Nova encomenda',
    size: 'medium',
    left: { label: 'Cancelar' },
    right: { label: src ? 'Guardar' : 'Criar', bold: true, action: (sh) => {
      if (!od.name?.trim()) { toast('Dá um nome à encomenda', { icon: 'alert' }); return; }
      od.name = od.name.trim();
      const saved = upsert('orders', od);
      sh.close();
      if (!src) go('encomenda', { id: saved.id });
    } },
    render: () => `
      <div class="section"><div class="list">
        <div class="field"><input style="text-align:left" placeholder="Nome (ex.: ZenMarket outubro)" value="${esc(od.name)}" data-input="order-f" data-k="name"></div>
        <div class="field"><label>Data</label><input type="date" value="${od.date || ''}" data-change="order-f" data-k="date"></div>
        <div class="field"><label>Origem</label><select data-change="order-f" data-k="source">${SOURCES.map((s) => `<option ${s === od.source ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      </div></div>
      <div class="section"><div class="section-header">Portes, taxas, alfândega e IVA</div><div class="list">
        <div class="field"><span class="f-label">Em euros</span><input inputmode="decimal" placeholder="0,00" value="${numIn(od.extraEur)}" data-input="order-f" data-k="extraEur" id="od-eur"><span class="unit">€</span></div>
        <div class="field"><span class="f-label">ou em ienes</span><input inputmode="numeric" placeholder="0" value="${numIn(od.extraJpy, 0)}" data-input="order-f" data-k="extraJpy" id="od-jpy"><span class="unit">¥</span></div>
      </div></div>
      <div class="section"><div class="list"><div class="field stack"><textarea rows="2" placeholder="Notas" data-input="order-f" data-k="notes">${esc(od.notes || '')}</textarea></div></div></div>
      ${src ? `<div class="section"><div class="list"><button class="row danger" data-act="order-del">Apagar encomenda</button></div>
        <div class="section-footer">Os artigos não são apagados, apenas deixam de pertencer à encomenda.</div></div>` : ''}`,
  });
}
on('order-f', (el) => {
  const k = el.dataset.k, rate = state.settings.rate;
  if (k === 'extraEur') {
    od.extraEur = el.value.trim() ? parseNum(el.value) : null;
    od.extraJpy = od.extraEur == null ? null : Math.round(od.extraEur / rate);
    document.getElementById('od-jpy').value = numIn(od.extraJpy, 0);
  } else if (k === 'extraJpy') {
    od.extraJpy = el.value.trim() ? parseNum(el.value) : null;
    od.extraEur = od.extraJpy == null ? null : round2(od.extraJpy * rate);
    document.getElementById('od-eur').value = numIn(od.extraEur);
  } else od[k] = el.value;
});
on('order-del', async () => {
  if (!(await confirmDestructive(od.name, 'Apagar encomenda'))) return;
  state.items.filter((i) => i.orderId === od.id).forEach((i) => upsert('items', { ...i, orderId: null }, { silent: true }));
  remove('orders', od.id);
  document.querySelector('.sheet.show .sheet-head [data-sheet-btn="left"]')?.click();
  back();
  toast('Encomenda apagada', { icon: 'trash' });
});

// ---------- Rever ----------
registerView('rever', {
  render() {
    const items = state.items.filter((i) => i.review);
    const inbox = state.inbox;
    if (!items.length && !inbox.length) {
      return { title: 'Rever', html: `<div class="empty-state">${icon('checkCircle')}<div class="e-title">Tudo revisto</div>Não há nada por classificar.</div>` };
    }
    const quick = (id) => `<div style="display:flex;gap:8px;padding:0 0 12px">
      <button class="chip sm" data-act="rev-set" data-id="${id}" data-value="stock">Em stock</button>
      <button class="chip sm" data-act="rev-set" data-id="${id}" data-value="kept">Guardado</button>
      <button class="chip sm" data-act="rev-sell" data-id="${id}">Vendido…</button></div>`;
    return {
      title: 'Rever',
      html: `
        ${inbox.length ? `<div class="section">
          <div class="section-header">Vendas nas plataformas · ${inbox.length}</div>
          <div class="list">${inbox.map((v) => `<div class="row" style="flex-wrap:wrap">
            <div class="body" style="padding-bottom:6px"><div class="title">${esc(v.name)}</div><div class="sub num">${esc(v.platform)} · ${eur(v.price)}</div></div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;padding:0 0 12px;width:100%">
              <button class="chip sm" data-act="inb-link" data-id="${v.id}">Associar</button>
              <button class="chip sm" data-act="inb-create" data-id="${v.id}">Criar venda</button>
              <button class="chip sm" data-act="inb-ignore" data-id="${v.id}" style="color:var(--red)">Ignorar</button>
            </div></div>`).join('')}</div>
          <div class="section-footer">Vendas das folhas Vinted/Wallapop que não consegui ligar a um artigo do Excel.</div></div>` : ''}
        ${items.length ? `<div class="section">
          <div class="section-header"><span>Artigos por classificar · ${items.length}</span><button data-act="rev-all-stock">Todos em stock</button></div>
          <div class="list">${items.map((it) => `<div class="row" style="flex-wrap:wrap">
            <button class="body" data-act="open-item" data-id="${it.id}" style="text-align:left;padding-bottom:6px"><div class="title">${esc(it.name)}</div><div class="sub num">Custo ${eur(itemCost(it))}</div></button>
            ${quick(it.id)}</div>`).join('')}</div>
          <div class="section-footer">No Excel não tinham venda nem preço previsto. Diz se estão em stock, guardados ou já vendidos.</div></div>` : ''}`,
    };
  },
});
on('rev-set', (el) => {
  const it = find('items', el.dataset.id);
  upsert('items', { ...it, status: el.dataset.value, review: null });
  haptic('success');
  toast(el.dataset.value === 'kept' ? 'Marcado como guardado' : 'Marcado em stock');
});
on('rev-sell', (el) => {
  openItem(el.dataset.id);
  setTimeout(() => document.querySelector('.sheet.show [data-act="item-status"][data-value="sold"]')?.click(), 60);
});
on('rev-all-stock', async () => {
  const items = state.items.filter((i) => i.review);
  const i = await actionSheet({ title: `Marcar ${items.length} artigos como em stock?`, buttons: [{ label: 'Marcar todos em stock' }] });
  if (i !== 0) return;
  items.forEach((it) => upsert('items', { ...it, status: 'stock', review: null }, { silent: true }));
  commit();
  toast('Todos marcados em stock');
});
on('inb-ignore', (el) => { remove('inbox', el.dataset.id); haptic(); });
on('inb-create', (el) => {
  const v = find('inbox', el.dataset.id);
  openItem(null, { name: v.name, status: 'sold', salePrice: v.price, platform: v.platform, saleDate: null, buyDate: null, source: null, _inbox: v.id });
});
on('inb-link', (el) => {
  const v = find('inbox', el.dataset.id);
  const words = v.name.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  const score = (it) => words.filter((w) => it.name.toLowerCase().includes(w)).length + (Math.abs((it.salePrice || it.estPrice || 0) - v.price) < 0.01 ? 2 : 0);
  const cands = state.items.filter((i) => (i.status === 'sold' && !i.platform) || i.status === 'stock')
    .map((i) => [i, score(i)]).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).slice(0, 30);
  const sheet = openSheet({
    title: 'Associar venda',
    left: { label: 'Cancelar' },
    render: () => `
      <div class="sheet-hero"><div class="sh-value num">${eur(v.price)}</div><div class="sh-label">${esc(v.name)} · ${esc(v.platform)}</div></div>
      <div class="section"><div class="section-header">Artigos parecidos</div><div class="list">
        ${cands.length ? cands.map(([it]) => `<button class="row" data-act="inb-pick" data-id="${it.id}" data-v="${v.id}">
          <div class="body"><div class="title">${esc(it.name)}</div><div class="sub num">${it.status === 'sold' ? `Vendido por ${eur(it.salePrice)}` : `Em stock${it.estPrice ? ` · ≈ ${eur(it.estPrice)}` : ''}`}</div></div>
          ${icon('link', 'chev')}</button>`).join('') : '<div class="kv"><span>Nenhum artigo parecido.</span></div>'}
      </div><div class="section-footer">Um artigo em stock passa a vendido por ${eur(v.price)} em ${esc(v.platform)}.</div></div>`,
  });
  on('inb-pick', (b) => {
    const it = find('items', b.dataset.id);
    const inb = find('inbox', b.dataset.v);
    upsert('items', { ...it, status: 'sold', platform: inb.platform, salePrice: it.status === 'sold' ? it.salePrice : inb.price, review: null }, { silent: true });
    remove('inbox', inb.id);
    sheet.close();
    haptic('success');
    toast('Venda associada', { icon: 'link' });
  });
});

// ---------- Câmbio e IVA ----------
registerView('cambio', {
  render() {
    const s = state.settings;
    return {
      title: 'Câmbio e IVA',
      html: `
        <div class="hero" style="text-align:center"><div class="label" style="justify-content:center">1 euro vale</div>
          <div class="value num">${jpy(1 / s.rate)}</div><div class="meta num">¥1 000 = ${eur(1000 * s.rate)}${s.rateDate ? ` · BCE ${fmtDate(s.rateDate)}` : ''}</div></div>
        <div class="pad" style="margin-bottom:28px"><button class="btn" data-act="rate-fetch">${icon('refresh')}Atualizar com a taxa do BCE</button></div>
        <div class="section"><div class="section-header">Manual</div><div class="list">
          <div class="field"><span class="f-label">1 € =</span><input inputmode="decimal" value="${numIn(1 / s.rate, 2)}" data-change="rate-set"><span class="unit">¥</span></div>
          <div class="field"><span class="f-label">IVA importação</span><input inputmode="decimal" value="${numIn(s.vat * 100, 1)}" data-change="vat-set"><span class="unit">%</span></div>
        </div>
        <div class="section-footer">O custo de cada artigo fica guardado em euros no momento da compra, por isso mudar o câmbio não altera compras antigas — só as novas e a calculadora.</div></div>`,
    };
  },
});
on('rate-set', (el) => { const v = parseNum(el.value); if (v > 0) { setSettings({ rate: 1 / v, rateDate: null }); toast('Câmbio atualizado'); } });
on('vat-set', (el) => { const v = parseNum(el.value); if (v >= 0) { setSettings({ vat: v / 100 }); toast('IVA atualizado'); } });
on('rate-fetch', async () => {
  try {
    const r = await fetch('https://api.frankfurter.app/latest?from=JPY&to=EUR');
    const j = await r.json();
    if (!j.rates?.EUR) throw new Error();
    setSettings({ rate: j.rates.EUR, rateDate: j.date });
    haptic('success');
    toast(`1 € = ${jpy(1 / j.rates.EUR)}`, { icon: 'globe' });
  } catch { toast('Sem ligação à internet', { icon: 'alert' }); }
});

// ---------- Dados e sincronização ----------
export async function importBackup() {
  const file = await pickFile();
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (data?.app === 'bey-contas' && data.kind === 'dates') {
      const n = applyDates(data.dates || {});
      haptic('success');
      toast(n ? `Datas preenchidas em ${n} artigos` : 'Os artigos já tinham datas', { icon: 'check', ms: 4000 });
      return;
    }
    const r = merge(data);
    migrateStockRule(); // an old Excel import file gets the current stock rule too
    haptic('success');
    toast(r.added + r.updated + r.removed ? `${r.added} novos · ${r.updated} atualizados · ${r.removed} apagados` : 'Já estava tudo igual', { ms: 4000 });
  } catch (e) {
    toast(e.message?.includes('Bey Contas') ? e.message : 'Ficheiro inválido', { icon: 'alert' });
  }
}

registerView('dados', {
  render() {
    const s = state.settings;
    return {
      title: 'Dados',
      html: `
        <div class="hero"><div class="label">${icon('info')}Neste dispositivo</div>
          <div class="value num" style="font-size:34px">${state.items.length} artigos</div>
          <div class="meta">${state.orders.length} encomendas · ${state.collection.length} peças na coleção · última cópia ${ago(s.lastBackup)}</div></div>
        <div class="section"><div class="section-header">Sincronizar dispositivos</div><div class="list">
          ${navRow('backup-share', 'share', 'var(--blue)', 'Partilhar cópia')}
          ${navRow('import-backup', 'download', 'var(--green)', 'Importar cópia')}
        </div>
        <div class="section-footer">
          <b>Como passar para outro dispositivo:</b> toca em “Partilhar cópia” e envia o ficheiro por AirDrop, WhatsApp, e-mail ou guarda no iCloud/Google Drive. No outro dispositivo, abre o Bey Contas e toca em “Importar cópia”.<br><br>
          A importação <b>junta</b> os dados: fica sempre a versão mais recente de cada artigo e nada é duplicado. Podes importar nos dois sentidos.</div></div>
        <div class="section"><div class="section-header">Exportar</div><div class="list">
          ${navRow('export-csv', 'doc', 'var(--green)', 'Folha de cálculo (CSV)')}
        </div><div class="section-footer">Abre no Excel ou Numbers.</div></div>
        <div class="section"><div class="list"><button class="row danger" data-act="wipe">Apagar todos os dados deste dispositivo</button></div></div>`,
    };
  },
});
on('backup-share', async () => {
  const name = `bey-contas-${today()}.json`;
  const res = await shareFile(name, JSON.stringify(exportData()));
  if (res !== 'cancelled') { setSettings({ lastBackup: Date.now() }); toast(res === 'shared' ? 'Cópia partilhada' : 'Cópia descarregada'); }
});
on('import-backup', () => importBackup());
on('export-csv', () => {
  const cols = ['Nome', 'Estado', 'Custo EUR', 'Custo JPY', 'Portes/taxas EUR', 'Custo total EUR', 'Data compra', 'Origem', 'Encomenda', 'Preço previsto', 'Preço venda', 'Taxas venda', 'Lucro', 'Plataforma', 'Data venda', 'Notas'];
  const st = { stock: 'Em stock', sold: 'Vendido', kept: 'Guardado', gifted: 'Oferta' };
  const n = (v) => (v == null || v === '' ? '' : String(round2(v)).replace('.', ','));
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = state.items.map((it) => {
    const share = orderShare(it), cost = itemCost(it);
    return [q(it.name), st[it.status], n(it.costEur), it.costJpy ?? '', n(share), n(cost), it.buyDate || '', q(it.source || ''),
      q(find('orders', it.orderId)?.name || ''), n(it.estPrice), n(it.salePrice), n(it.fees),
      it.status === 'sold' ? n((it.salePrice || 0) - (it.fees || 0) - cost) : '', q(it.platform || ''), it.saleDate || '', q(it.notes || '')].join(';');
  });
  shareFile(`bey-contas-${today()}.csv`, '﻿' + [cols.join(';'), ...rows].join('\r\n'), 'text/csv');
});
on('wipe', async () => {
  if (!(await confirmDestructive('Apagar todos os dados?', 'Apagar tudo', 'Faz primeiro uma cópia. Os outros dispositivos não são afetados.'))) return;
  wipe();
  toast('Dados apagados', { icon: 'trash' });
});

