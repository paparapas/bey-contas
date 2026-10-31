import { state } from '../store.js';
import { kpis, level, monthly, byPlatform, itemProfit, reviewCount, itemCost, itemNet, soldInMonth, boughtInMonth } from '../calc.js';
import { icon, eur, eur0, signed, cls, pct, esc, fmtMonth, fmtDate, on, ago, haptic, openSheet, seg, segTap } from '../ui.js';
import { registerView, go, switchTab, refresh } from '../nav.js';
import { openItem } from '../item-sheet.js';
import { importBackup, reinstallBanner } from './mais.js';

const LVL_COLOR = { good: 'var(--green)', ok: 'var(--yellow)', warn: 'var(--orange)', bad: 'var(--red)' };

function tile(label, value, sub, { ic, color, valCls = '', act = '' } = {}) {
  const tag = act ? 'button' : 'div';
  return `<${tag} class="tile" ${act}>
    <div class="t-label">${ic ? `<span style="color:${color}">${icon(ic)}</span>` : ''}${label}</div>
    <div class="t-value num ${valCls}">${value}</div>
    ${sub ? `<div class="t-sub">${sub}</div>` : ''}
  </${tag}>`;
}

// Chart metrics; the chosen one per chart is remembered on this device.
const SALE_METRICS = [
  { value: 'profit', label: 'Lucro', key: 'profit', money: true, signed: true, title: 'Lucro por mês' },
  { value: 'sales', label: 'Valor', key: 'sales', money: true, color: 'var(--blue)', title: 'Valor vendido por mês' },
  { value: 'n', label: 'Nº vendas', key: 'n', color: 'var(--teal)', title: 'Vendas por mês', unit: ['venda', 'vendas'] },
];
const BUY_METRICS = [
  { value: 'spent', label: 'Valor', key: 'spent', money: true, color: 'var(--orange)', title: 'Gasto em compras por mês' },
  { value: 'nb', label: 'Nº compras', key: 'nb', color: 'var(--purple)', title: 'Compras por mês', unit: ['compra', 'compras'] },
];
const pref = (k, d) => { try { return localStorage.getItem(k) || d; } catch { return d; } };
let saleMetric = pref('chart-sales', 'profit'), buyMetric = pref('chart-buys', 'spent');

function monthChart(metrics, chosen, segName, hasData) {
  const data = monthly();
  const mt = metrics.find((m) => m.value === chosen) || metrics[0];
  const head = `${seg(segName, metrics.map(({ value, label }) => ({ value, label })), mt.value, 'in-row')}`;
  if (!data.some(([, m]) => hasData(m))) {
    return `<div class="chart"><div style="display:flex;margin-bottom:10px">${head}</div><div class="empty">${icon('chart')}<br>Ainda sem datas.<br><span style="font-size:13px">Adiciona datas aos artigos para veres a evolução mês a mês.</span></div></div>`;
  }
  // Layout: value labels on top, bars, then month + year labels underneath.
  const W = 340, TOP = 16, H = 150, step = (W - 8) / data.length, bw = Math.min(22, step - 6);
  const vals = data.map(([, m]) => m[mt.key]);
  const max = Math.max(1, ...vals.map(Math.abs));
  const hasNeg = vals.some((v) => v < 0);
  const zero = hasNeg ? TOP + (H - TOP) / 2 : H;
  const scale = (hasNeg ? (H - TOP) / 2 - 12 : H - TOP - 4) / max;
  const colorOf = (v) => mt.color || (v >= 0 ? 'var(--green)' : 'var(--red)');
  const bars = data.map(([k, m], i) => {
    const v = m[mt.key];
    const x = 4 + i * step + (step - bw) / 2, cx = x + bw / 2;
    const h = v ? Math.max(2, Math.abs(v) * scale) : 0;
    const y = v >= 0 ? zero - h : zero;
    const [yy, mm] = k.split('-');
    const showYear = i === 0 || mm === '01';
    const label = v || hasData(m) ? `<text class="axis val" x="${cx}" y="${v >= 0 ? y - 4 : y + h + 10}" text-anchor="middle">${Math.round(v)}</text>` : '';
    return `<g class="bar" data-act="month-open" data-month="${k}">
      <rect x="${4 + i * step}" y="0" width="${step}" height="${H + 30}" fill="transparent"/>
      ${h ? `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="4" fill="${colorOf(v)}" style="transform-origin:${x}px ${zero}px;animation:barUp .8s cubic-bezier(.32,.72,0,1) ${i * 0.04}s both"/>` : ''}
      ${label}
      <text class="axis" x="${cx}" y="${H + 13}" text-anchor="middle">${fmtMonth(k)}</text>
      ${showYear ? `<text class="axis yr" x="${cx}" y="${H + 25}" text-anchor="middle">${yy}</text>` : ''}
    </g>`;
  }).join('');
  const total = vals.reduce((a, b) => a + b, 0);
  const totalTxt = mt.money ? (mt.signed ? signed(total) : eur(total)) : `${total} ${total === 1 ? mt.unit[0] : mt.unit[1]}`;
  return `<div class="chart">
    <div style="display:flex;margin-bottom:10px">${head}</div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
      <span style="font-size:13px;color:var(--label-2);font-weight:500">${mt.title}</span>
      <span class="num ${mt.signed ? cls(total) : ''}" style="font-weight:600">${totalTxt}</span>
    </div>
    <svg viewBox="0 0 ${W} ${H + 30}" class="month-chart">
      <style>@keyframes barUp{from{transform:scaleY(0)}}</style>
      <line class="grid" x1="0" x2="${W}" y1="${zero}" y2="${zero}"/>
      ${bars}
    </svg>
    <div style="font-size:12px;color:var(--label-2);text-align:center;margin-top:2px">Toca num mês para ver o detalhe</div></div>`;
}

function setMetric(el, which) {
  segTap(el);
  if (which === 'sales') saleMetric = el.dataset.value; else buyMetric = el.dataset.value;
  try { localStorage.setItem(which === 'sales' ? 'chart-sales' : 'chart-buys', el.dataset.value); } catch { /* private mode */ }
  setTimeout(refresh, 140);
}
on('chart-sales', (el) => setMetric(el, 'sales'));
on('chart-buys', (el) => setMetric(el, 'buys'));

// Sheet with one month's sales and purchases.
function openMonth(ym) {
  const sold = soldInMonth(ym).sort((a, b) => a.saleDate.localeCompare(b.saleDate));
  const bought = boughtInMonth(ym).sort((a, b) => a.buyDate.localeCompare(b.buyDate));
  const profit = sold.reduce((s, i) => s + itemProfit(i), 0);
  const sales = sold.reduce((s, i) => s + itemNet(i), 0);
  const spent = bought.reduce((s, i) => s + itemCost(i), 0);
  const title = new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' }).format(new Date(ym + '-15T12:00'));
  haptic();
  openSheet({
    title: title.charAt(0).toUpperCase() + title.slice(1),
    size: 'large',
    left: { label: 'Fechar' },
    render: () => `
      <div class="sheet-hero"><div class="sh-value num ${cls(profit)}">${signed(profit)}</div>
        <div class="sh-label">Lucro de ${sold.length} ${sold.length === 1 ? 'venda' : 'vendas'}</div></div>
      <div class="tiles" style="grid-template-columns:1fr 1fr">
        ${tile('Vendas', eur(sales), `${sold.length} artigos`, { ic: 'tag', color: 'var(--green)' })}
        ${tile('Compras', eur(spent), `${bought.length} artigos`, { ic: 'cart', color: 'var(--orange)' })}
      </div>
      ${sold.length ? `<div class="section"><div class="section-header">Vendas</div><div class="list">
        ${sold.map((it) => { const p = itemProfit(it); return `<button class="row" data-act="open-item" data-id="${it.id}">
          <div class="body"><div class="title">${esc(it.name)}</div><div class="sub num">${[fmtDate(it.saleDate), it.platform, `${eur(itemCost(it))} → ${eur(it.salePrice)}`].filter(Boolean).join(' · ')}</div></div>
          <div class="right num ${cls(p)}" style="font-weight:600">${signed(p)}</div></button>`; }).join('')}
      </div></div>` : ''}
      ${bought.length ? `<div class="section"><div class="section-header">Compras</div><div class="list">
        ${bought.map((it) => `<button class="row" data-act="open-item" data-id="${it.id}">
          <div class="body"><div class="title">${esc(it.name)}</div><div class="sub num">${fmtDate(it.buyDate)}</div></div>
          <div class="right num" style="color:var(--label-2)">${eur(itemCost(it))}</div></button>`).join('')}
      </div></div>` : ''}
      ${!sold.length && !bought.length ? '<div class="empty-state">Sem vendas nem compras neste mês.</div>' : ''}`,
  });
}
on('month-open', (el) => openMonth(el.dataset.month));

function itemRows(list) {
  return list.map((it) => {
    const p = itemProfit(it);
    return `<button class="row" data-act="open-item" data-id="${it.id}">
      <div class="body"><div class="title">${esc(it.name)}</div><div class="sub num">${eur(itemCost(it))} → ${eur(it.salePrice)}</div></div>
      <div class="right num ${cls(p)}" style="font-weight:600">${signed(p)}</div>
    </button>`;
  }).join('');
}

registerView('resumo', {
  render() {
    const k = kpis();
    const nReview = reviewCount();
    if (!state.items.length && !state.collection.length) {
      return {
        title: 'Resumo',
        html: `<div class="empty-state">${icon('chart')}<div class="e-title">Bem-vindo</div>
          Começa por importar uma cópia (por exemplo os dados do Excel) ou adiciona o teu primeiro artigo.</div>
          <div class="pad" style="display:grid;gap:12px">
            <button class="btn" data-act="import-backup">${icon('download')}Importar cópia</button>
            <button class="btn secondary" data-act="new-item">${icon('plus')}Adicionar artigo</button>
          </div>`,
      };
    }
    const lv = level(k.realized), lvp = level(k.predicted);
    const sold = state.items.filter((i) => i.status === 'sold');
    const best = [...sold].sort((a, b) => itemProfit(b) - itemProfit(a)).slice(0, 5);
    const worst = [...sold].sort((a, b) => itemProfit(a) - itemProfit(b)).filter((i) => itemProfit(i) < 0).slice(0, 5);
    const plats = byPlatform();
    const platMax = Math.max(1, ...plats.map(([, m]) => m.sales));
    const needBackup = (Date.now() - (state.settings.lastBackup || 0)) > 14 * 86400000;
    const partsCount = state.collection.reduce((s, c) => s + (c.qty || 1), 0);

    return {
      title: 'Resumo',
      right: `<button class="nav-btn" data-act="new-item" aria-label="Novo artigo">${icon('plus')}</button>`,
      html: `
      <div class="stagger">
        ${reinstallBanner()}
        ${nReview ? `<button class="banner" data-act="goto-rever">
          <div class="icon-box" style="background:var(--orange)">${icon('alert')}</div>
          <div style="flex:1"><div class="b-title">${nReview} ${nReview === 1 ? 'registo' : 'registos'} para rever</div><div class="b-sub">Artigos importados sem estado e vendas por associar</div></div>
          ${icon('chevR', 'chev')}</button>` : ''}

        <div class="hero">
          <div class="glow" style="background:${LVL_COLOR[lv]}"></div>
          <div class="label"><span class="dot bg-${lv}"></span>Resultado atual</div>
          <div class="value num lvl-${lv}">${signed(k.realized)}</div>
          <div class="meta num">Vendas ${eur(k.sales)} · Gasto ${eur(k.spent)}</div>
        </div>

        <div class="tiles">
          ${tile('Previsto', signed(k.predicted), 'Se vender o stock', { ic: 'sparkle', color: LVL_COLOR[lvp], valCls: `lvl-${lvp}` })}
          ${tile('Em stock', eur0(k.stockValue), `${k.inStock} artigos${k.noEstimate ? ` · ${k.noEstimate} sem preço` : ''}`, { ic: 'box', color: 'var(--blue)', act: 'data-act="goto-stock"' })}
          ${tile('Coleção', eur0(k.coll), `${partsCount} peças`, { ic: 'star', color: 'var(--purple)', act: 'data-act="goto-colecao"' })}
          ${tile('Posição total', signed(k.position), 'Previsto + coleção', { ic: 'wallet', color: 'var(--indigo)', valCls: cls(k.position) })}
          ${tile('Lucro médio', signed(k.avgProfit), `por venda · ${k.sold} vendas`, { ic: 'tag', color: 'var(--teal)', valCls: cls(k.avgProfit) })}
          ${tile('Vendas com lucro', pct(k.winRate), `${k.kept} guardados`, { ic: 'checkCircle', color: 'var(--green)' })}
        </div>

        <div class="section"><div class="section-header big">Vendas</div>${monthChart(SALE_METRICS, saleMetric, 'chart-sales', (m) => m.n > 0)}</div>
        <div class="section"><div class="section-header big">Compras</div>${monthChart(BUY_METRICS, buyMetric, 'chart-buys', (m) => m.nb > 0)}</div>

        ${plats.length ? `<div class="section">
          <div class="section-header big">Plataformas</div>
          <div class="chart"><div class="bars-h">
            ${plats.map(([name, m], i) => `<div class="bar-h">
              <div class="bar-top"><span>${esc(name)}</span><span class="num">${eur(m.sales)} · ${m.n}</span></div>
              <div class="bar-track"><div class="bar-fill" style="width:${(m.sales / platMax) * 100}%;background:var(--blue);animation-delay:${i * 0.05}s"></div></div>
            </div>`).join('')}
          </div></div></div>` : ''}

        ${best.length ? `<div class="section"><div class="section-header big">Melhores vendas</div><div class="list">${itemRows(best)}</div></div>` : ''}
        ${worst.length ? `<div class="section"><div class="section-header big">Vendas com prejuízo</div><div class="list">${itemRows(worst)}</div></div>` : ''}

        ${needBackup ? `<button class="banner" data-act="goto-dados">
          <div class="icon-box" style="background:var(--blue)">${icon('share')}</div>
          <div style="flex:1"><div class="b-title">Faz uma cópia de segurança</div><div class="b-sub">Última cópia: ${ago(state.settings.lastBackup)}. Partilha para os outros dispositivos.</div></div>
          ${icon('chevR', 'chev')}</button>` : ''}
      </div>`,
    };
  },
});

on('open-item', (el) => openItem(el.dataset.id));
on('new-item', () => openItem(null));
on('goto-rever', () => { switchTab('mais'); go('rever'); });
on('goto-dados', () => { switchTab('mais'); go('dados'); });
on('goto-colecao', () => switchTab('colecao'));
on('import-backup', () => importBackup());
