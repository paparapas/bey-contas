// Screen diagnostics for the installed app (Mais › Versão).
// On iOS 26 an app added to the Home Screen while the page asked for the
// translucent status bar (versions ≤ 1.3) is one status-bar height short and
// iOS leaves the bottom strip unpainted. Nothing in CSS can draw there; the
// app has to be removed and added again so iOS picks up the default status bar.

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

export function measure() {
  ensureProbes();
  const cs = getComputedStyle(insetProbe);
  const portrait = innerHeight > innerWidth;
  const fixedBottom = Math.round(probe.getBoundingClientRect().top);
  const insetTop = parseFloat(cs.paddingTop) || 0;
  const screenH = portrait ? screen.height : screen.width;
  // Translucent install: the page starts under the status bar (insetTop > 0)
  // but ends that same height above the bottom of the screen.
  const shortBy = isStandalone() && portrait && screenH ? screenH - fixedBottom : 0;
  return {
    standalone: isStandalone(),
    screen: `${screen.width}×${screen.height}`,
    inner: `${innerWidth}×${innerHeight}`,
    visual: window.visualViewport ? Math.round(visualViewport.height) : null,
    fixedBottom,
    insetTop,
    insetBottom: parseFloat(cs.paddingBottom) || 0,
    shortBy,
    needsReinstall: insetTop > 0 && shortBy > 10,
  };
}
