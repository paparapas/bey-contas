import { state } from '../store.js';
import { kpis, level, monthly, byPlatform, itemProfit, reviewCount, itemCost } from '../calc.js';
import { icon, eur, eur0, signed, cls, pct, esc, fmtMonth, on, ago } from '../ui.js';
import { registerView, go, switchTab } from '../nav.js';
import { openItem } from '../item-sheet.js';
import { importBackup } from './mais.js';

const LVL_COLOR = { good: 'var(--green)', ok: 'var(--yellow)', warn: 'var(--orange)', bad: 'var(--red)' };

function tile(label, value, sub, { ic, color, valCls = '', act = '' } = {}) {
  const tag = act ? 'button' : 'div';
  return `<${tag} class="tile" ${act}>
    <div class="t-label">${ic ? `<span style="color:${color}">${icon(ic)}</span>` : ''}${label}</div>
    <div class="t-value num ${valCls}">${value}</div>
    ${sub ? `<div class="t-sub">${sub}</div>` : ''}
  </${tag}>`;
}

function monthChart() {
  const data = monthly();
  if (!data.some(([, m]) => m.sales)) {
    return `<div class="chart"><div class="empty">${icon('chart')}<br>Ainda sem datas.<br><span style="font-size:13px">Adiciona datas de compra e venda aos artigos para veres a evolução mês a mês.</span></div></div>`;
  }
  const W = 340, H = 150, pad = 18, bw = Math.min(22, (W - 20) / data.length - 8);
  const vals = data.map(([, m]) => m.profit);
  const max = Math.max(1, ...vals.map(Math.abs));
  const hasNeg = vals.some((v) => v < 0);
  const zero = hasNeg ? H / 2 : H - pad;
  const scale = (hasNeg ? H / 2 - pad : H - pad * 2) / max;
  const step = (W - 20) / data.length;
  const bars = data.map(([k, m], i) => {
    const x = 10 + i * step + (step - bw) / 2;
    const h = Math.max(2, Math.abs(m.profit) * scale);
    const y = m.profit >= 0 ? zero - h : zero;
    return `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="4" fill="${m.profit >= 0 ? 'var(--green)' : 'var(--red)'}" style="transform-origin:${x}px ${zero}px;animation:barUp .8s cubic-bezier(.32,.72,0,1) ${i * 0.04}s both"/>
      <text class="axis" x="${x + bw / 2}" y="${H + 12}" text-anchor="middle">${fmtMonth(k)}</text>`;
  }).join('');
  const total = vals.reduce((a, b) => a + b, 0);
  return `<div class="chart">
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
      <span style="font-size:13px;color:var(--label-2);font-weight:500">Lucro por mês</span>
      <span class="num ${cls(total)}" style="font-weight:600">${signed(total)}</span>
    </div>
    <svg viewBox="0 0 ${W} ${H + 16}">
      <style>@keyframes barUp{from{transform:scaleY(0)}}</style>
      <line class="grid" x1="0" x2="${W}" y1="${zero}" y2="${zero}"/>
      ${bars}
    </svg></div>`;
}

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

        <div class="section">${monthChart()}</div>

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
