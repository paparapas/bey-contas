import { load, subscribe } from './store.js';
import { on, toast } from './ui.js';
import { switchTab, refresh, start, go } from './nav.js';
import { APP_VERSION } from './version.js';
import './views/resumo.js';
import './views/artigos.js';
import './views/colecao.js';
import './views/calculadora.js';
import './views/mais.js';

on('tab', (el) => switchTab(el.dataset.tab));

// In the installed app, iOS 26 ends fixed elements one status-bar height above
// the real bottom of the screen (on an iPhone 15 Pro Max: at 874pt of 932pt).
// Find where a fixed element's bottom really lands and move the fixed layers
// down by the difference.
const probe = document.createElement('div');
probe.style.cssText = 'position:fixed;left:0;bottom:0;width:0;height:0;pointer-events:none';
document.body.appendChild(probe);
function fixViewportDrop() {
  const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  const portrait = innerHeight > innerWidth;
  const fixedBottom = probe.getBoundingClientRect().top;
  const drop = standalone && portrait ? Math.round(screen.height - fixedBottom) : 0;
  document.documentElement.style.setProperty('--vp-drop', `${Math.min(Math.max(drop, 0), 120)}px`);
}
fixViewportDrop();
addEventListener('resize', fixViewportDrop);
addEventListener('orientationchange', () => setTimeout(fixViewportDrop, 300));

await load();
subscribe(refresh);
start();

// Tell the user when the app was updated since the last time it was opened.
try {
  const seen = localStorage.getItem('seen-version');
  if (seen && seen !== APP_VERSION) {
    setTimeout(() => toast(`Atualizado para a versão ${APP_VERSION}`, {
      icon: 'sparkle', action: 'Novidades', ms: 6000, onAction: () => { switchTab('mais'); go('novidades'); },
    }), 600);
  }
  localStorage.setItem('seen-version', APP_VERSION);
} catch { /* private mode */ }

// Offline + automatic updates. A new version is fetched in the background and
// applied the next time the app is opened (or right away from the toast).
// Skipped on localhost while developing (add ?sw to test it there).
const devSkip = location.hostname === 'localhost' && !location.search.includes('sw');
if ('serviceWorker' in navigator && !devSkip) {
  navigator.serviceWorker.register('sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const sw = reg.installing;
      sw?.addEventListener('statechange', () => {
        if (sw.state === 'installed' && navigator.serviceWorker.controller) {
          toast('Nova versão disponível', { icon: 'refresh', action: 'Atualizar', ms: 8000, onAction: () => sw.postMessage('skip') });
        }
      });
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  });
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
}
