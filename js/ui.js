// Small UI kit: icons, formatting, actions, sheets, action sheets, toasts,
// segmented controls, swipe rows and haptics.

// ---------- Icons (SF Symbols-like line icons) ----------
const P = {
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  star: '<path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9Z"/>',
  calc: '<rect x="4" y="2" width="16" height="20" rx="3"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15v3M8 18h.01M12 18h.01"/>',
  more: '<circle cx="12" cy="12" r="9.5"/><path d="M7.5 12h.01M12 12h.01M16.5 12h.01" stroke-width="2.6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  chevR: '<path d="m9 5 7 7-7 7"/>',
  chevL: '<path d="m15 5-7 7 7 7"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/>',
  share: '<path d="M12 3v13M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/>',
  download: '<path d="M12 3v13M7 11l5 5 5-5M5 21h14"/>',
  box: '<path d="m21 8-9-5-9 5v8l9 5 9-5Z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  alert: '<path d="M12 3 2 20h20Z"/><path d="M12 10v4M12 17h.01"/>',
  yen: '<path d="m6 4 6 8 6-8M12 12v8M7 13h10M7 17h10"/>',
  euro: '<path d="M17 6.5A7 7 0 1 0 17 17.5M4 10h9M4 14h9"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  checkCircle: '<circle cx="12" cy="12" r="9.5"/><path d="m8 12 3 3 5-6"/>',
  doc: '<path d="M14 3H6v18h12V7Z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>',
  globe: '<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5a14 14 0 0 1 0 19 14 14 0 0 1 0-19"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a1 1 0 0 0 1 .8h9.6a1 1 0 0 0 1-.8L21 7H6"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
  scale: '<path d="M12 3v18M5 7h14M5 7l-3 7a3 3 0 0 0 6 0ZM19 7l-3 7a3 3 0 0 0 6 0ZM8 21h8"/>',
  wallet: '<rect x="2.5" y="5.5" width="19" height="14" rx="3"/><path d="M2.5 9.5h19M16 14.5h2"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13M12 8S10.5 3 8 3.5 7 8 12 8ZM12 8s1.5-5 4-4.5S17 8 12 8Z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  info: '<circle cx="12" cy="12" r="9.5"/><path d="M12 11v6M12 7.5h.01"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  sort: '<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>',
};
export const icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[name] || ''}</svg>`;

// ---------- Formatting ----------
const eurFmt = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
const eur0Fmt = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const jpyFmt = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 0 });
export const eur = (n) => eurFmt.format(n || 0);
export const eur0 = (n) => eur0Fmt.format(n || 0);
export const signed = (n) => (n > 0.004 ? '+' : n < -0.004 ? '−' : '') + eurFmt.format(Math.abs(n || 0));
export const jpy = (n) => `¥${jpyFmt.format(n || 0)}`;
export const pct = (n) => `${Math.round((n || 0) * 100)}%`;
export const cls = (n) => (n > 0.004 ? 'pos' : n < -0.004 ? 'neg' : '');
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const parseNum = (v) => {
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
export const numIn = (n, dp = 2) => (n || n === 0 ? String(Math.round(n * 10 ** dp) / 10 ** dp).replace('.', ',') : '');
const dateFmt = new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'short', year: 'numeric' });
const monthFmt = new Intl.DateTimeFormat('pt-PT', { month: 'short' });
export const fmtDate = (iso) => (iso ? dateFmt.format(new Date(iso + 'T12:00')) : '');
export const fmtMonth = (ym) => monthFmt.format(new Date(ym + '-15T12:00')).replace('.', '');
export const today = () => new Date().toISOString().slice(0, 10);
export function ago(ts) {
  if (!ts) return 'nunca';
  const d = Math.floor((Date.now() - ts) / 86400000);
  return d <= 0 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`;
}

// ---------- Actions (event delegation) ----------
const actions = {};
export const on = (name, fn) => { actions[name] = fn; };
function dispatch(attr, e) {
  const el = e.target.closest(`[${attr}]`);
  if (!el) return;
  const fn = actions[el.getAttribute(attr)];
  if (fn) fn(el, e);
}
document.addEventListener('click', (e) => {
  if (e.target.closest('.row-wrap.swiped') && !e.target.closest('.swipe-actions')) {
    closeSwipes(); e.stopPropagation(); return;
  }
  dispatch('data-act', e);
});
document.addEventListener('input', (e) => dispatch('data-input', e));
document.addEventListener('change', (e) => dispatch('data-change', e));

// ---------- Haptics ----------
// Android: Vibration API. iOS 18+: toggling a native switch plays a system haptic.
let hapticLabel;
export function haptic(kind = 'light') {
  if (navigator.vibrate) { navigator.vibrate(kind === 'heavy' ? 18 : kind === 'success' ? [8, 40, 12] : 8); return; }
  if (!hapticLabel) {
    hapticLabel = document.createElement('label');
    hapticLabel.id = 'haptic';
    hapticLabel.innerHTML = '<input type="checkbox" switch>';
    document.body.appendChild(hapticLabel);
  }
  hapticLabel.click();
}

// ---------- Toast ----------
let toastTimer;
export function toast(msg, { icon: ic = 'checkCircle', action, onAction, ms = 2600 } = {}) {
  const el = document.getElementById('toast');
  el.innerHTML = `${icon(ic)}<span>${esc(msg)}</span>${action ? `<button>${esc(action)}</button>` : ''}`;
  if (action) el.querySelector('button').onclick = () => { el.classList.remove('show'); onAction?.(); };
  requestAnimationFrame(() => el.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

// ---------- Sheets ----------
const sheetStack = [];
export const sheetOpen = () => sheetStack.length > 0;

/**
 * Bottom sheet (iOS page sheet). `render()` returns the body HTML and is
 * called again by `sheet.update()`. Drag the header (or the content when
 * scrolled to the top) down to dismiss.
 */
export function openSheet({ title = '', left, right, render, size = 'large', onClose, onMount }) {
  const root = document.getElementById('sheets');
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  const el = document.createElement('div');
  el.className = `sheet ${size}`;
  el.setAttribute('role', 'dialog');
  const navBtn = (b, side) => (b ? `<button class="nav-btn ${b.bold ? 'bold' : ''}" data-sheet-btn="${side}">${b.label}</button>` : '<span></span>');
  el.innerHTML = `
    <div class="sheet-grabber"></div>
    <div class="sheet-head">
      <div class="nav-left">${navBtn(left, 'left')}</div>
      <div class="s-title">${esc(title)}</div>
      <div class="nav-right">${navBtn(right, 'right')}</div>
    </div>
    <div class="sheet-body"></div>`;
  root.append(backdrop, el);
  const body = el.querySelector('.sheet-body');

  const sheet = {
    el, body,
    update() { const st = body.scrollTop; body.innerHTML = render(sheet); body.scrollTop = st; },
    setTitle(t) { el.querySelector('.s-title').textContent = t; },
    close,
  };
  function close(result) {
    const i = sheetStack.indexOf(sheet);
    if (i < 0) return;
    sheetStack.splice(i, 1);
    el.classList.remove('show');
    backdrop.classList.remove('show');
    if (!sheetStack.length) document.body.classList.remove('sheet-open');
    document.activeElement?.blur?.();
    setTimeout(() => { el.remove(); backdrop.remove(); }, 500);
    onClose?.(result);
  }
  el.querySelector('[data-sheet-btn="left"]')?.addEventListener('click', () => (left.action ? left.action(sheet) : close()));
  el.querySelector('[data-sheet-btn="right"]')?.addEventListener('click', () => right.action(sheet));
  backdrop.addEventListener('click', () => close());

  sheet.update();
  sheetStack.push(sheet);
  onMount?.(sheet);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.classList.add('show');
    backdrop.classList.add('show');
    if (size === 'large') document.body.classList.add('sheet-open');
  }));
  dragToDismiss(el, body, close);
  return sheet;
}
export function closeTopSheet() { sheetStack[sheetStack.length - 1]?.close(); }

function dragToDismiss(el, body, close) {
  let startY = null, dy = 0, fromBody = false, t0 = 0;
  el.addEventListener('touchstart', (e) => {
    const inHead = e.target.closest('.sheet-head, .sheet-grabber');
    fromBody = !inHead;
    if (fromBody && (body.scrollTop > 0 || e.target.closest('input, textarea, select, .chips, .seg'))) return;
    startY = e.touches[0].clientY; dy = 0; t0 = Date.now();
  }, { passive: true });
  el.addEventListener('touchmove', (e) => {
    if (startY === null) return;
    dy = e.touches[0].clientY - startY;
    if (fromBody && (dy < 0 || body.scrollTop > 0)) { startY = null; el.classList.remove('dragging'); el.style.transform = ''; return; }
    if (dy > 0) {
      if (e.cancelable) e.preventDefault();
      el.classList.add('dragging');
      el.style.transform = `translateY(${dy}px)`;
    }
  }, { passive: false });
  el.addEventListener('touchend', () => {
    if (startY === null) return;
    const v = dy / Math.max(1, Date.now() - t0);
    el.classList.remove('dragging');
    el.style.transform = '';
    if (dy > el.offsetHeight * 0.3 || (v > 0.5 && dy > 40)) close();
    startY = null;
  });
}

/** iOS action sheet. `buttons`: [{label, style:'destructive'|'default', action}] */
export function actionSheet({ title, message, buttons }) {
  return new Promise((resolve) => {
    const root = document.getElementById('sheets');
    const backdrop = document.createElement('div');
    backdrop.className = 'sheet-backdrop';
    const el = document.createElement('div');
    el.className = 'action-sheet';
    el.innerHTML = `
      <div class="as-group">
        ${title || message ? `<div class="as-msg">${title ? `<b>${esc(title)}</b>` : ''}${esc(message || '')}</div>` : ''}
        ${buttons.map((b, i) => `<button class="${b.style || ''}" data-i="${i}">${esc(b.label)}</button>`).join('')}
      </div>
      <div class="as-group"><button class="cancel" data-i="-1">Cancelar</button></div>`;
    root.append(backdrop, el);
    const done = (i) => {
      el.classList.remove('show'); backdrop.classList.remove('show');
      setTimeout(() => { el.remove(); backdrop.remove(); }, 450);
      const b = buttons[i];
      if (b) b.action?.();
      resolve(b ? i : -1);
    };
    el.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) done(+b.dataset.i); });
    backdrop.addEventListener('click', () => done(-1));
    requestAnimationFrame(() => requestAnimationFrame(() => { el.classList.add('show'); backdrop.classList.add('show'); }));
  });
}
export const confirmDestructive = (title, label, message) =>
  actionSheet({ title, message, buttons: [{ label, style: 'destructive' }] }).then((i) => i === 0);

// ---------- Segmented control ----------
/** Markup; give it `data-seg="name"` handled with on(name). Thumb is positioned by layoutSegs(). */
export function seg(name, options, value, extra = '') {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return `<div class="seg ${extra}" data-seg-count="${options.length}" data-seg-idx="${idx}">
    <span class="thumb-sel"></span>
    ${options.map((o) => `<button data-act="${name}" data-value="${esc(o.value)}" class="${o.value === value ? 'on' : ''}">${esc(o.label)}</button>`).join('')}
  </div>`;
}
export function layoutSegs(root = document) {
  root.querySelectorAll('.seg').forEach((s) => {
    const n = +s.dataset.segCount, i = +s.dataset.segIdx;
    const th = s.querySelector('.thumb-sel');
    th.style.width = `calc((100% - 4px) / ${n})`;
    th.style.transform = `translateX(${i * 100}%)`;
  });
}
/** Moves the thumb with animation before the re-render happens. */
export function segTap(el) {
  const s = el.closest('.seg');
  const i = [...s.querySelectorAll('button')].indexOf(el);
  s.dataset.segIdx = i;
  s.querySelector('.thumb-sel').style.transform = `translateX(${i * 100}%)`;
  s.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === i));
  haptic();
}
new MutationObserver(() => layoutSegs()).observe(document.documentElement, { childList: true, subtree: true });

// ---------- Swipe rows ----------
/** Wraps a row with trailing (left-swipe) actions: [{label, icon, color, act, id}] */
export function swipeRow(rowHtml, trailing = [], leading = []) {
  const btns = (list) => list.map((a) => `<button data-act="${a.act}" data-id="${esc(a.id)}" style="background:${a.color}">${a.icon ? icon(a.icon) : ''}${esc(a.label)}</button>`).join('');
  return `<div class="row-wrap" data-swipe>
    ${leading.length ? `<div class="swipe-actions left">${btns(leading)}</div>` : ''}
    ${trailing.length ? `<div class="swipe-actions right">${btns(trailing)}</div>` : ''}
    ${rowHtml}
  </div>`;
}
// Keeps the actions visible while the row slides back over them.
function settle(w) {
  w.classList.add('settling');
  clearTimeout(w._settle);
  w._settle = setTimeout(() => w.classList.remove('settling'), 420);
}
function closeSwipes(except) {
  document.querySelectorAll('.row-wrap.swiped').forEach((w) => {
    if (w === except) return;
    w.classList.remove('swiped');
    settle(w);
    w.querySelector('.row').style.transform = '';
  });
}
(function initSwipe() {
  let wrap, row, x0, y0, base, dx, locked, width;
  document.addEventListener('touchstart', (e) => {
    wrap = e.target.closest('[data-swipe]');
    if (!wrap) { closeSwipes(); return; }
    closeSwipes(wrap);
    row = wrap.querySelector('.row');
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    const m = /translateX\((-?[\d.]+)px\)/.exec(row.style.transform);
    base = m ? +m[1] : 0; dx = 0; locked = null;
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!wrap) return;
    const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
    if (locked === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) locked = Math.abs(mx) > Math.abs(my) ? 'x' : 'y';
    if (locked !== 'x') return;
    if (e.cancelable) e.preventDefault();
    const right = wrap.querySelector('.swipe-actions.right'), left = wrap.querySelector('.swipe-actions.left');
    const min = right ? -right.offsetWidth : 0, max = left ? left.offsetWidth : 0;
    width = { min, max };
    let t = base + mx;
    if (t < min) t = min + (t - min) * 0.3;
    if (t > max) t = max + (t - max) * 0.3;
    dx = t;
    wrap.dataset.dir = t < 0 ? 'right' : 'left'; // only the side being uncovered is shown
    wrap.classList.add('dragging');
    row.style.transform = `translateX(${t}px)`;
  }, { passive: false });
  document.addEventListener('touchend', () => {
    if (!wrap || locked !== 'x') { wrap = null; return; }
    wrap.classList.remove('dragging');
    let target = 0;
    if (dx < width.min / 2) target = width.min;
    else if (dx > width.max / 2) target = width.max;
    row.style.transform = target ? `translateX(${target}px)` : '';
    wrap.classList.toggle('swiped', target !== 0);
    if (target) haptic(); else settle(wrap);
    wrap = null;
  });
})();

// ---------- Stepper ----------
export const stepper = (act, id, value) => `
  <div class="stepper">
    <button data-act="${act}" data-id="${esc(id)}" data-d="-1" aria-label="Menos">${icon('minus')}</button>
    <span class="s-sep"></span>
    <button data-act="${act}" data-id="${esc(id)}" data-d="1" aria-label="Mais">${icon('plus')}</button>
  </div>`;

// ---------- Share / download a file ----------
export async function shareFile(name, text, type = 'application/json') {
  const file = new File([text], name, { type });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return 'shared'; }
    catch (e) { if (e.name === 'AbortError') return 'cancelled'; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'downloaded';
}
export function pickFile(accept = '.json,application/json') {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = accept;
    input.onchange = () => resolve(input.files[0] || null);
    input.click();
  });
}
