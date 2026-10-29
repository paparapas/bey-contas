// Tab bar + one navigation stack per tab (push / pop with iOS animations,
// large titles that collapse into the bar, swipe from the left edge to go back).
import { icon, esc, haptic } from './ui.js';
import { reviewCount } from './calc.js';

export const TABS = [
  { id: 'resumo', label: 'Resumo', icon: 'chart' },
  { id: 'artigos', label: 'Artigos', icon: 'tag' },
  { id: 'colecao', label: 'Coleção', icon: 'star' },
  { id: 'calc', label: 'Calculadora', icon: 'calc' },
  { id: 'mais', label: 'Mais', icon: 'more' },
];

const views = {};
export const registerView = (name, view) => { views[name] = view; };

let current = 'resumo';
const stacks = Object.fromEntries(TABS.map((t) => [t.id, [{ view: t.id, params: {}, scroll: 0 }]]));
const screensEl = () => document.getElementById('screens');
const top = () => stacks[current][stacks[current].length - 1];
export const currentTab = () => current;

function screenHtml(route, depth) {
  const v = views[route.view].render(route.params || {});
  const stack = stacks[current];
  const prev = depth > 0 ? views[stack[depth - 1].view].render(stack[depth - 1].params || {}).title : '';
  const backBtn = depth > 0 ? `<button class="nav-btn back" data-act="nav-back">${icon('chevL')}<span>${esc(prev.length > 12 ? 'Voltar' : prev)}</span></button>` : (v.left || '');
  return `
    <header class="navbar">
      <div class="nav-left">${backBtn}</div>
      <div class="nav-title">${esc(v.title)}</div>
      <div class="nav-right">${v.right || ''}</div>
    </header>
    ${v.large === false ? '<div style="height:8px"></div>' : `<h1 class="large-title">${esc(v.title)}</h1>`}
    ${v.html}`;
}

function makeScreen(route, depth) {
  const el = document.createElement('section');
  el.className = 'screen';
  if (views[route.view].render(route.params || {}).large === false) el.classList.add('small-title');
  el.innerHTML = screenHtml(route, depth);
  el.addEventListener('scroll', () => {
    el.classList.toggle('scrolled', el.scrollTop > (el.classList.contains('small-title') ? 2 : 38));
  }, { passive: true });
  if (el.classList.contains('small-title')) el.querySelector('.nav-title').style.cssText = 'opacity:1;transform:none';
  return el;
}

function activeScreen() {
  const all = screensEl().querySelectorAll('.screen:not(.push-out):not(.pop-out)');
  return all[all.length - 1];
}

/** Re-render the visible screen (keeps scroll position). */
export function refresh() {
  const el = activeScreen();
  if (el) {
    const st = el.scrollTop;
    const stack = stacks[current];
    el.innerHTML = screenHtml(top(), stack.length - 1);
    el.scrollTop = st;
    views[top().view].mount?.(el, top().params || {});
  }
  renderTabbar();
}

function show(anim) {
  const el = makeScreen(top(), stacks[current].length - 1);
  if (anim) {
    el.classList.add(anim);
    // Also on a timer: animationend never fires while the app is in the background.
    const done = () => el.classList.remove(anim);
    el.addEventListener('animationend', done, { once: true });
    setTimeout(done, 700);
  }
  screensEl().appendChild(el);
  el.scrollTop = top().scroll || 0;
  views[top().view].mount?.(el, top().params || {});
  return el;
}

export function go(view, params = {}) {
  const old = activeScreen();
  top().scroll = old?.scrollTop || 0;
  stacks[current].push({ view, params, scroll: 0 });
  show('push-in');
  if (old) {
    old.classList.add('push-out');
    setTimeout(() => old.remove(), 500);
  }
}

export function back() {
  const stack = stacks[current];
  if (stack.length < 2) return;
  const old = activeScreen();
  stack.pop();
  show('pop-in');
  screensEl().appendChild(old);
  old.classList.add('pop-out');
  setTimeout(() => old.remove(), 450);
}

export function start() {
  screensEl().innerHTML = '';
  show('fade-in');
  renderTabbar();
}

export function switchTab(id) {
  if (id === current) {
    const el = activeScreen();
    if (stacks[id].length > 1) { stacks[id].length = 1; screensEl().innerHTML = ''; show('fade-in'); }
    else el?.scrollTo({ top: 0, behavior: 'smooth' });
    renderTabbar();
    return;
  }
  const el = activeScreen();
  if (el) top().scroll = el.scrollTop;
  current = id;
  screensEl().innerHTML = '';
  show('fade-in');
  renderTabbar();
  haptic();
}

export function renderTabbar() {
  const n = reviewCount();
  document.getElementById('tabbar').innerHTML = TABS.map((t) => `
    <button class="tab ${t.id === current ? 'active' : ''}" data-act="tab" data-tab="${t.id}" aria-label="${t.label}">
      ${icon(t.icon)}<span>${t.label}</span>
      ${t.id === 'mais' && n ? `<span class="badge">${n > 99 ? '99+' : n}</span>` : ''}
    </button>`).join('');
}

// Swipe from the left edge to go back.
(function edgeSwipe() {
  let el, under, x0, y0, dx, active;
  document.addEventListener('touchstart', (e) => {
    if (stacks[current].length < 2 || document.body.classList.contains('sheet-open')) return;
    const t = e.touches[0];
    if (t.clientX > 24) return;
    el = activeScreen(); x0 = t.clientX; y0 = t.clientY; dx = 0; active = null;
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!el) return;
    const t = e.touches[0];
    const mx = t.clientX - x0, my = t.clientY - y0;
    if (active === null && (Math.abs(mx) > 6 || Math.abs(my) > 6)) {
      active = mx > Math.abs(my);
      if (active) {
        const stack = stacks[current];
        under = makeScreen(stack[stack.length - 2], stack.length - 2);
        under.style.transform = 'translateX(-30%)';
        under.style.filter = 'brightness(0.9)';
        screensEl().insertBefore(under, el);
        el.style.boxShadow = '-10px 0 30px rgba(0,0,0,.12)';
      } else { el = null; return; }
    }
    if (!active) return;
    if (e.cancelable) e.preventDefault();
    dx = Math.max(0, mx);
    const w = window.innerWidth;
    el.style.transform = `translateX(${dx}px)`;
    under.style.transform = `translateX(${-30 + (dx / w) * 30}%)`;
    under.style.filter = `brightness(${0.9 + (dx / w) * 0.1})`;
  }, { passive: false });
  document.addEventListener('touchend', () => {
    if (!el || !active) { el = null; return; }
    const w = window.innerWidth, done = dx > w * 0.33;
    const tr = 'transform .35s cubic-bezier(.32,.72,0,1), filter .35s';
    el.style.transition = tr; under.style.transition = tr;
    el.style.transform = done ? `translateX(${w}px)` : '';
    under.style.transform = done ? '' : 'translateX(-30%)';
    under.style.filter = done ? '' : 'brightness(0.9)';
    const [a, b] = [el, under];
    setTimeout(() => {
      if (done) {
        a.remove(); stacks[current].pop();
        b.style.cssText = ''; b.scrollTop = top().scroll || 0;
        views[top().view].mount?.(b, top().params || {});
      } else { b.remove(); a.style.cssText = ''; }
    }, 360);
    el = null;
  });
})();
