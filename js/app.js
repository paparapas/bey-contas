import { load, subscribe } from './store.js';
import { on, toast } from './ui.js';
import { switchTab, refresh, start, go } from './nav.js';
import { APP_VERSION } from './version.js';
import { initViewport } from './viewport.js';
import './views/resumo.js';
import './views/artigos.js';
import './views/colecao.js';
import './views/calculadora.js';
import './views/mais.js';

on('tab', (el) => switchTab(el.dataset.tab));

initViewport();

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
