// Keeps the tab bar on the real bottom of the screen in the installed iPhone app.
// iOS 26 can end fixed elements above the screen bottom (on an iPhone 15 Pro Max
// the bar stopped at ~874pt of 932pt). We measure the gap and move the fixed
// layers (#app, #tabbar, #sheets) down by --vp-drop. If the measurement is wrong
// on some device, a manual offset (Mais › Versão › Ajuste da barra) overrides it.

const KEY = 'bar-offset';
let probe, insetProbe;

function ensureProbes() {
  if (probe) return;
  probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:0;bottom:0;width:0;height:0;pointer-events:none;visibility:hidden';
  insetProbe = document.createElement('div');
  insetProbe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
  document.body.append(probe, insetProbe);
}

export const isStandalone = () => navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;

export function manualOffset() {
  try { const v = localStorage.getItem(KEY); return v === null ? null : +v; } catch { return null; }
}
export function setManualOffset(v) {
  try { if (v === null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, String(v)); } catch { /* private mode */ }
  apply();
}

/** What the browser reports; shown in Mais › Versão to diagnose a device. */
export function measure() {
  ensureProbes();
  const cs = getComputedStyle(insetProbe);
  const portrait = innerHeight > innerWidth;
  const fixedBottom = Math.round(probe.getBoundingClientRect().top);
  const screenH = portrait ? screen.height : screen.width;
  const auto = isStandalone() && portrait ? Math.min(Math.max(screenH - fixedBottom, 0), 120) : 0;
  return {
    standalone: isStandalone(),
    screen: `${screen.width}×${screen.height}`,
    inner: `${innerWidth}×${innerHeight}`,
    visual: window.visualViewport ? Math.round(visualViewport.height) : null,
    docH: document.documentElement.clientHeight,
    fixedBottom,
    insetTop: parseFloat(cs.paddingTop) || 0,
    insetBottom: parseFloat(cs.paddingBottom) || 0,
    auto,
    manual: manualOffset(),
  };
}

export function apply() {
  const m = measure();
  const drop = m.manual ?? m.auto;
  document.documentElement.style.setProperty('--vp-drop', `${drop}px`);
  return { ...m, drop };
}

export function initViewport() {
  apply();
  addEventListener('resize', apply);
  addEventListener('orientationchange', () => setTimeout(apply, 300));
  // iOS sometimes settles the viewport a moment after launch.
  setTimeout(apply, 500);
  setTimeout(apply, 1500);
}
