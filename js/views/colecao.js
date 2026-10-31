// Personal collection by skin. Parts come from the BBPT Hub catalog (data/parts.json);
// the known skins of each part (releases / colour versions) from the Beyblade
// Wiki text (data/skins.json, CC BY-SA). Each owned skin can have your own photo,
// with the background removed on the device.
import { state, upsert, remove, find, putPhoto, deletePhoto, getPhoto } from '../store.js';
import { collectionValue } from '../calc.js';
import { icon, eur, eur0, esc, on, seg, segTap, stepper, haptic, toast, openSheet, parseNum, numIn, confirmDestructive, pct, pickFile } from '../ui.js';
import { registerView, refresh } from '../nav.js';
import { loadPhoto, hasTransparency, removeBackground, finish, opaqueBox } from '../cutout.js';

export const TYPES = {
  blade: 'Blades', ratchet: 'Ratchets', bit: 'Bits', lockchip: 'Lock Chips',
  assist: 'Assist Blades', metal: 'Metal Blades', over: 'Over Blades', other: 'Outros',
};
const TYPE_COLOR = { blade: 'var(--blue)', ratchet: 'var(--orange)', bit: 'var(--green)', lockchip: 'var(--purple)', assist: 'var(--teal)', metal: 'var(--indigo)', over: 'var(--pink)', other: 'var(--label-2)' };
const TYPE_ORDER = Object.keys(TYPES);
const PRICE_CHIPS = [2, 5, 8, 10, 15, 20, 30, 50, 100];
const CONDITIONS = [{ value: 'novo', label: 'Novo' }, { value: 'usado', label: 'Usado' }];
const WIKI = 'https://beyblade.fandom.com/wiki/';

// ---------- Catalog ----------
let catalog = [];                 // Hub parts + parts that exist only on the wiki
const skinsByPart = new Map();    // partId -> [{ k, title, sub, wiki }]
const wikiPageOf = new Map();     // partId -> wiki page title
let skinsMeta = null;

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function skinTitle(s) {
  if (s.version) return s.version;
  if (s.slot) return `${s.product} #${s.slot}`;
  return s.maker === 'Hasbro' ? 'Original (Hasbro)' : 'Original';
}
function skinSub(s) {
  const t = skinTitle(s);
  return [s.code, s.product !== t && !t.startsWith(s.product) ? s.product : null, s.bey && s.bey !== s.product ? s.bey : null].filter(Boolean).join(' · ');
}

Promise.all([
  fetch('data/parts.json').then((r) => r.json()),
  fetch('data/skins.json').then((r) => r.json()).catch(() => null),
]).then(([parts, skins]) => {
  const list = [...parts];
  if (skins) {
    skinsMeta = skins;
    for (const p of skins.parts) {
      let id = p.part;
      if (!id) { // part not in the Hub catalog: still collectable
        id = `wiki:${slug(p.wiki)}`;
        if (!list.some((x) => x.id === id)) list.push({ id, name: p.name.replace(/\s*\((Hasbro|Takara Tomy)\)$/, ''), type: p.type, line: 'Wiki', spin: null, img: null, wikiOnly: true });
      }
      wikiPageOf.set(id, wikiPageOf.get(id) || p.wiki);
      const arr = skinsByPart.get(id) || [];
      for (const s of p.skins) arr.push({ k: s.k, title: skinTitle(s), sub: skinSub(s), maker: s.maker, wiki: p.wiki });
      skinsByPart.set(id, arr);
    }
  }
  catalog = list.sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || (a.wikiOnly ? 1 : 0) - (b.wikiOnly ? 1 : 0)
    || (a.line || '').localeCompare(b.line || '') || a.name.localeCompare(b.name, 'pt', { numeric: true }));
  refresh();
}).catch(() => {});

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const partById = (id) => catalog.find((p) => p.id === id);
const skinsOf = (partId) => skinsByPart.get(partId) || [];
const entriesOf = (partId) => state.collection.filter((c) => c.partId === partId);
const entryForSkin = (partId, k) => state.collection.find((c) => c.partId === partId && c.skinKey === k);
const ownedSkinCount = (partId) => new Set(entriesOf(partId).map((c) => c.skinKey || `none:${c.id}`)).size;
const skinLabel = (c) => c.skinName || (c.skinKey ? skinsOf(c.partId).find((s) => s.k === c.skinKey)?.title : null) || 'Sem skin definida';

// Images: <img data-photo="entryId"> starts with the Hub picture and switches to
// your own photo once it is read from storage.
function partImg(partId, size, extra = '') {
  const src = partById(partId)?.img;
  return src ? `<img src="${src}" alt="" loading="lazy" decoding="async" style="width:${size}px;height:${size}px;object-fit:contain" ${extra}>`
    : `<div class="ph" style="width:${size}px;height:${size}px" ${extra}>${icon('star')}</div>`;
}
function entryImg(c, size) {
  if (!c?.photoAt) return partImg(c?.partId, size);
  const fallback = partById(c.partId)?.img || 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
  return `<img src="${fallback}" data-photo="${c.id}" data-v="${c.photoAt}" alt="" style="width:${size}px;height:${size}px;object-fit:contain">`;
}
function hydratePhotos(root = document) {
  root.querySelectorAll('img[data-photo]').forEach(async (el) => {
    const want = `${el.dataset.photo}@${el.dataset.v}`;
    if (el.dataset.shown === want) return;
    el.dataset.shown = want;
    const url = await getPhoto(el.dataset.photo);
    if (url) el.src = url;
  });
}
new MutationObserver(() => hydratePhotos()).observe(document.documentElement, { childList: true, subtree: true });

function ring(p, color = 'var(--purple)') {
  const r = 37, C = 2 * Math.PI * r;
  return `<svg class="ring" viewBox="0 0 84 84"><circle class="track" cx="42" cy="42" r="${r}"/>
    <circle class="prog" cx="42" cy="42" r="${r}" stroke="${color}" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - p)}"/>
    <text x="42" y="47" text-anchor="middle" style="font:700 17px var(--font-round);fill:var(--label)">${p > 0 && p < 0.1 ? `${(p * 100).toFixed(1).replace('.', ',')}%` : pct(p)}</text></svg>`;
}

// ---------- Dashboard ----------
function dashboard() {
  const value = collectionValue();
  const pieces = state.collection.reduce((s, c) => s + (c.qty || 1), 0);
  const hubParts = catalog.filter((p) => !p.wikiOnly);
  const ownedParts = new Set(state.collection.map((c) => c.partId));
  const partsDone = hubParts.filter((p) => ownedParts.has(p.id)).length;
  const knownSkins = [...skinsByPart.values()].reduce((s, a) => s + a.length, 0);
  const ownedSkins = new Set(state.collection.filter((c) => c.skinKey && !c.skinKey.startsWith('custom:')).map((c) => `${c.partId}|${c.skinKey}`)).size;
  const byType = TYPE_ORDER.map((t) => {
    const inCat = hubParts.filter((p) => p.type === t).length;
    const owned = hubParts.filter((p) => p.type === t && ownedParts.has(p.id)).length;
    const val = state.collection.filter((c) => partById(c.partId)?.type === t).reduce((s, c) => s + (c.price || 0) * (c.qty || 1), 0);
    return { t, inCat, owned, val };
  }).filter((x) => x.inCat);
  const top = [...state.collection].filter((c) => c.price).sort((a, b) => b.price * (b.qty || 1) - a.price * (a.qty || 1)).slice(0, 5);
  return `
    <div class="hero">
      <div class="glow" style="background:var(--purple)"></div>
      <div class="ring-wrap">
        ${ring(hubParts.length ? partsDone / hubParts.length : 0)}
        <div style="min-width:0">
          <div class="label">Valor da coleção</div>
          <div class="value num" style="font-size:36px">${eur0(value)}</div>
          <div class="meta num">${pieces} peças · ${partsDone} de ${hubParts.length} peças do catálogo</div>
          <div class="meta num">${ownedSkins} de ${knownSkins} skins conhecidas</div>
        </div>
      </div>
    </div>
    <div class="section"><div class="chart"><div class="bars-h">
      ${byType.map((x, i) => `<div class="bar-h">
        <div class="bar-top"><span>${TYPES[x.t]}</span><span class="num">${x.owned}/${x.inCat} · ${eur0(x.val)}</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${(x.owned / x.inCat) * 100}%;background:${TYPE_COLOR[x.t]};animation-delay:${i * 0.05}s"></div></div>
      </div>`).join('')}
    </div></div></div>
    ${top.length ? `<div class="section"><div class="section-header big">Mais valiosas</div><div class="list">
      ${top.map((c) => `<button class="row" data-act="col-entry" data-id="${c.id}" style="--inset:72px">
        <span class="thumb" style="display:grid;place-items:center;overflow:hidden">${entryImg(c, 40)}</span>
        <div class="body"><div class="title">${esc(partById(c.partId)?.name || c.name)}</div><div class="sub">${esc(skinLabel(c))}${c.qty > 1 ? ` · ×${c.qty}` : ''}</div></div>
        <div class="right num" style="font-weight:600">${eur(c.price * (c.qty || 1))}</div></button>`).join('')}
    </div></div>` : ''}`;
}

// ---------- Grids ----------
let mode = 'mine', typeFilter = 'all', query = '';

function mineHtml() {
  const q = norm(query.trim());
  const list = state.collection.filter((c) => {
    const p = partById(c.partId);
    return (typeFilter === 'all' || (p?.type || c.type) === typeFilter) && (!q || norm(`${p?.name || c.name} ${skinLabel(c)}`).includes(q));
  });
  if (!state.collection.length) {
    return `<div class="empty-state">${icon('star')}<div class="e-title">Coleção vazia</div>Abre o catálogo e escolhe as skins que tens, ou começa uma sessão de fotos.</div>
      <div class="pad" style="display:grid;gap:12px"><button class="btn" data-act="col-session">${icon('sparkle')}Sessão de fotos</button>
      <button class="btn secondary" data-act="coll-mode" data-value="catalog">Abrir catálogo</button></div>`;
  }
  if (!list.length) return '<div class="empty-state">Sem peças para este filtro.</div>';
  const name = (c) => partById(c.partId)?.name || c.name || '';
  return `<div class="part-grid">${list.sort((a, b) => name(a).localeCompare(name(b)) || skinLabel(a).localeCompare(skinLabel(b))).map((c) => `
    <button class="part-cell" data-act="col-entry" data-id="${c.id}">
      ${c.qty > 1 ? `<span class="owned">×${c.qty}</span>` : ''}
      ${entryImg(c, 72)}<div class="p-name">${esc(name(c))}</div>
      <div class="skin-name">${esc(skinLabel(c))}</div>
    </button>`).join('')}</div>`;
}

function catalogHtml() {
  const q = norm(query.trim());
  const list = catalog.filter((p) => (typeFilter === 'all' || p.type === typeFilter) && (!q || norm(p.name).includes(q)));
  if (!list.length) return '<div class="empty-state">Sem peças para esta pesquisa.</div>';
  return `<div class="part-grid">${list.map((p) => {
    const have = ownedSkinCount(p.id), total = skinsOf(p.id).length;
    return `<button class="part-cell ${have ? '' : 'dim'}" data-act="col-part" data-id="${p.id}">
      ${have ? `<span class="owned">${have}${total ? `/${total}` : ''}</span>` : ''}
      ${partImg(p.id, 72)}<div class="p-name">${esc(p.name)}</div>
      <div class="skin-name">${total ? `${total} skins` : (p.line || TYPES[p.type])}${p.wikiOnly ? ' · wiki' : ''}</div>
    </button>`;
  }).join('')}</div>`;
}

const bodyHtml = () => (mode === 'mine' ? mineHtml() : catalogHtml());

registerView('colecao', {
  render() {
    const types = ['all', ...TYPE_ORDER.filter((t) => t !== 'other' || state.collection.some((c) => c.type === 'other'))];
    return {
      title: 'Coleção',
      right: `<button class="nav-btn" data-act="col-session" aria-label="Sessão de fotos">${icon('camera')}</button>
              <button class="nav-btn" data-act="coll-mode" data-value="catalog" aria-label="Adicionar peça">${icon('plus')}</button>`,
      html: `
        ${mode === 'mine' ? dashboard() : ''}
        ${seg('coll-mode', [{ value: 'mine', label: 'A minha coleção' }, { value: 'catalog', label: 'Catálogo' }], mode)}
        <label class="search">${icon('search')}<input type="search" placeholder="${mode === 'mine' ? 'Procurar na coleção' : 'Procurar no catálogo'}" value="${esc(query)}" data-input="coll-search" autocomplete="off"></label>
        <div class="chips">${types.map((t) => `<button class="chip ${t === typeFilter ? 'on' : ''}" data-act="coll-type" data-value="${t}">${t === 'all' ? 'Tudo' : TYPES[t]}</button>`).join('')}</div>
        <div id="coll-body">${bodyHtml()}</div>
        ${skinsMeta ? `<div class="section-footer" style="text-align:center">Lista de skins: <a href="https://beyblade.fandom.com" target="_blank" rel="noopener" style="color:var(--blue)">Beyblade Wiki</a> (CC BY-SA), ${skinsMeta.fetched}. Imagens das peças: BBPT Hub.</div>` : ''}`,
    };
  },
});

on('coll-mode', (el) => {
  if (el.closest('.seg')) segTap(el);
  mode = el.dataset.value; query = '';
  setTimeout(refresh, el.closest('.seg') ? 120 : 0);
});
on('coll-type', (el) => { typeFilter = el.dataset.value; haptic(); refresh(); });
on('coll-search', (el) => { query = el.value; el.closest('.screen').querySelector('#coll-body').innerHTML = bodyHtml(); });

// ---------- Part sheet: the skins of one part ----------
let partSheetRef = null;
function openPart(partId, { pick } = {}) {
  const p = partById(partId);
  if (!p) return;
  const sheet = openSheet({
    title: p.name,
    left: { label: pick ? 'Voltar' : 'Fechar' },
    render: () => {
      const skins = skinsOf(partId);
      const extra = entriesOf(partId).filter((c) => !c.skinKey || c.skinKey.startsWith('custom:') || !skins.some((s) => s.k === c.skinKey));
      const have = ownedSkinCount(partId);
      const wiki = wikiPageOf.get(partId);
      return `
        <div style="display:grid;place-items:center;padding:0 0 8px">${partImg(partId, 110)}</div>
        <div class="sheet-hero" style="padding-top:0"><div class="sh-label">${TYPES[p.type]}${p.line ? ` · ${esc(p.line)}` : ''}</div>
          <div style="font-size:15px;margin-top:4px">${pick ? 'Que skin é esta?' : `Tens <b>${have}</b> de ${skins.length} skins conhecidas`}</div></div>
        ${skins.length ? `<div class="section"><div class="section-header">Skins</div><div class="list">
          ${skins.map((s) => { const c = entryForSkin(partId, s.k); return `<button class="row" data-act="col-skin" data-part="${partId}" data-k="${s.k}" style="--inset:72px">
            <span class="thumb skin-thumb ${c ? '' : 'missing'}">${c ? entryImg(c, 44) : partImg(partId, 44)}</span>
            <div class="body"><div class="title">${esc(s.title)}</div><div class="sub">${esc(s.sub)}</div></div>
            ${c ? `<span class="pill green">${c.qty > 1 ? `×${c.qty}` : 'Tenho'}</span>` : icon(pick ? 'chevR' : 'plus', 'chev')}</button>`; }).join('')}
        </div></div>` : ''}
        <div class="section"><div class="section-header">${skins.length ? 'Outras skins' : 'Skins'}</div><div class="list">
          ${extra.map((c) => `<button class="row" data-act="col-entry" data-id="${c.id}" style="--inset:72px">
            <span class="thumb skin-thumb">${entryImg(c, 44)}</span>
            <div class="body"><div class="title">${esc(skinLabel(c))}</div><div class="sub">Adicionada por ti</div></div>
            <span class="pill green">${c.qty > 1 ? `×${c.qty}` : 'Tenho'}</span></button>`).join('')}
          <button class="row action" data-act="col-custom" data-part="${partId}">${icon('plus')}<span>Skin que não está na lista</span></button>
        </div>
        ${wiki ? `<div class="section-footer">Lista da <a href="${WIKI}${encodeURIComponent(wiki.replace(/ /g, '_'))}" target="_blank" rel="noopener" style="color:var(--blue)">Beyblade Wiki</a> (CC BY-SA). Toca numa skin para ver a foto oficial na wiki.</div>` : ''}</div>`;
    },
    onClose: () => { if (partSheetRef === sheet) partSheetRef = null; },
  });
  partSheetRef = sheet;
  return sheet;
}
on('col-part', (el) => openPart(el.dataset.id));

// ---------- Skin sheet: one owned (or to-be-owned) skin ----------
let d = null, pendingPhoto = null, skinSheet = null;

function openSkin(entry, { isNew, skin, onSaved } = {}) {
  d = { ...entry };
  pendingPhoto = entry._photo || null;
  delete d._photo;
  const p = partById(d.partId);
  skinSheet = openSheet({
    title: isNew ? 'Adicionar skin' : 'Skin',
    size: 'large',
    left: { label: 'Cancelar' },
    right: { label: isNew ? 'Adicionar' : 'Guardar', bold: true, action: async (sh) => {
      if (!d.skinKey && !d.skinName?.trim()) { toast('Dá um nome à skin', { icon: 'alert' }); return; }
      if (d.skinName) d.skinName = d.skinName.trim();
      d.name = p?.name || d.name; d.type = p?.type || d.type;
      if (pendingPhoto === 'delete') { d.photoAt = null; }
      else if (pendingPhoto) d.photoAt = Date.now();
      const saved = upsert('collection', d);
      if (pendingPhoto === 'delete') await deletePhoto(saved.id);
      else if (pendingPhoto) await putPhoto(saved.id, pendingPhoto);
      haptic('success');
      sh.close();
      partSheetRef?.update();
      refresh();
      onSaved ? onSaved(saved) : toast(isNew ? 'Adicionado à coleção' : 'Guardado', { icon: 'star' });
    } },
    render: () => {
      const photo = pendingPhoto && pendingPhoto !== 'delete' ? `<img src="${pendingPhoto}" alt="">`
        : d.photoAt && pendingPhoto !== 'delete' ? entryImg(d, 180) : partImg(d.partId, 180, 'style="opacity:.45"');
      const wiki = skin?.wiki || (d.skinKey ? skinsOf(d.partId).find((s) => s.k === d.skinKey)?.wiki : null);
      return `
        <div class="photo-box">${photo}</div>
        <div class="btn-row">
          <button class="btn secondary" data-act="col-photo">${icon('camera')}${d.photoAt || (pendingPhoto && pendingPhoto !== 'delete') ? 'Nova foto' : 'Tirar foto'}</button>
          ${d.photoAt || (pendingPhoto && pendingPhoto !== 'delete') ? `<button class="btn destructive" data-act="col-photo-del">${icon('trash')}Sem foto</button>` : `<span></span>`}
        </div>
        <div class="section"><div class="list">
          <div class="kv"><span>Peça</span><span style="font-weight:600">${esc(p?.name || d.name)}</span></div>
          ${d.skinKey && !d.skinKey.startsWith('custom:') ? `<div class="kv"><span>Skin</span><span style="text-align:right">${esc(skin?.title || skinLabel(d))}${skin?.sub ? `<br><span style="color:var(--label-2);font-size:13px">${esc(skin.sub)}</span>` : ''}</span></div>`
            : `<div class="field"><span class="f-label">Skin</span><input placeholder="Ex.: Metal Coat Red, cor azul…" value="${esc(d.skinName || '')}" data-input="skin-f" data-k="skinName"></div>`}
          <div class="field"><span class="f-label">Quantidade</span><span style="flex:1;text-align:right;font-weight:600" class="num" id="skin-qty">${d.qty}</span>${stepper('skin-qty', '', d.qty)}</div>
          <div class="field"><span class="f-label">Valor aprox. (cada)</span><input inputmode="decimal" placeholder="0,00" value="${numIn(d.price)}" data-input="skin-f" data-k="price"><span class="unit">€</span></div>
        </div></div>
        <div class="chips">${PRICE_CHIPS.map((v) => `<button class="chip ${d.price === v ? 'on' : ''}" data-act="skin-price" data-value="${v}">${v} €</button>`).join('')}</div>
        <div style="height:16px"></div>
        ${seg('skin-cond', CONDITIONS, d.condition || 'novo')}
        <div class="section"><div class="list"><div class="field stack"><textarea rows="2" placeholder="Notas" data-input="skin-f" data-k="notes">${esc(d.notes || '')}</textarea></div></div></div>
        <div class="section"><div class="list">
          ${wiki ? `<a class="row action" href="${WIKI}${encodeURIComponent(wiki.replace(/ /g, '_'))}" target="_blank" rel="noopener">${icon('globe')}<span>Ver fotos na Beyblade Wiki</span></a>` : ''}
          ${!isNew ? `<button class="row danger" data-act="skin-del">Remover da coleção</button>` : ''}
        </div></div>`;
    },
  });
}

function newEntry(partId, skin) {
  const p = partById(partId);
  return { partId, name: p?.name, type: p?.type, skinKey: skin ? skin.k : `custom:${Date.now().toString(36)}`, skinName: skin ? skin.title : '', qty: 1, price: null, condition: 'novo', notes: '', photoAt: null };
}

on('col-skin', (el) => {
  const partId = el.dataset.part, skin = skinsOf(partId).find((s) => s.k === el.dataset.k);
  if (session.active) { session.pickSkin(partId, skin); return; }
  const c = entryForSkin(partId, skin.k);
  openSkin(c || newEntry(partId, skin), { isNew: !c, skin });
});
on('col-custom', (el) => {
  if (session.active) { session.pickSkin(el.dataset.part, null); return; }
  openSkin(newEntry(el.dataset.part, null), { isNew: true });
});
on('col-entry', (el) => {
  const c = find('collection', el.dataset.id);
  if (!c) return;
  openSkin(c, { skin: c.skinKey ? skinsOf(c.partId).find((s) => s.k === c.skinKey) : null });
});
on('skin-f', (el) => { d[el.dataset.k] = el.dataset.k === 'price' ? (el.value.trim() ? parseNum(el.value) : null) : el.value; });
on('skin-qty', (el) => { d.qty = Math.max(1, Math.min(99, (d.qty || 1) + +el.dataset.d)); skinSheet.body.querySelector('#skin-qty').textContent = d.qty; haptic(); });
on('skin-price', (el) => { d.price = +el.dataset.value; haptic(); skinSheet.update(); });
on('skin-cond', (el) => { segTap(el); d.condition = el.dataset.value; });
on('col-photo', async () => { const url = await takePhoto(); if (url) { pendingPhoto = url; skinSheet.update(); } });
on('col-photo-del', () => { pendingPhoto = 'delete'; skinSheet.update(); });
on('skin-del', async () => {
  if (!(await confirmDestructive(`${d.name} — ${skinLabel(d)}`, 'Remover da coleção'))) return;
  remove('collection', d.id);
  await deletePhoto(d.id);
  skinSheet.close();
  partSheetRef?.update();
  toast('Removido da coleção', { icon: 'trash' });
});

// ---------- Photo: pick, remove background, confirm ----------
/** Opens the camera / library, then the background-removal editor. Resolves to a data URL or null. */
export async function takePhoto() {
  const file = await pickFile('image/*');
  if (!file) return null;
  let src;
  try { src = await loadPhoto(file); } catch (e) { toast(e.message, { icon: 'alert' }); return null; }
  return photoEditor(src);
}

function photoEditor(src) {
  return new Promise((resolve) => {
    const already = hasTransparency(src);
    let auto = !already, strength = 45, result = null, done = false;
    const compute = () => {
      if (already) result = finish(src, opaqueBox(src));
      else if (!auto) result = finish(src, null);
      else {
        const r = removeBackground(src, strength);
        result = finish(r.canvas, r.box);
        ed.warn = r.kept > 0.92 ? 'Quase nada foi removido: aumenta a força ou fotografa sobre um fundo liso.' : r.kept < 0.02 ? 'Foi removido quase tudo: baixa a força.' : '';
      }
    };
    const ed = { warn: '' };
    const sheet = openSheet({
      title: 'Foto',
      size: 'large',
      left: { label: 'Cancelar' },
      right: { label: 'Usar', bold: true, action: (sh) => { done = true; sh.close(); resolve(result); } },
      onClose: () => { if (!done) resolve(null); },
      render: () => `
        <div class="photo-box big"><img src="${result}" alt=""></div>
        ${already ? '<div class="section-footer" style="text-align:center;padding-bottom:16px">A imagem já vem sem fundo e foi mantida.</div>' : `
        ${seg('ph-mode', [{ value: 'auto', label: 'Remover fundo' }, { value: 'off', label: 'Foto original' }], auto ? 'auto' : 'off')}
        ${auto ? `<div class="section"><div class="list"><div class="field"><span class="f-label">Força</span>
          <input type="range" min="0" max="100" value="${strength}" data-input="ph-strength" style="flex:1"></div></div>
          <div class="section-footer">${ed.warn ? `<span style="color:var(--orange)">${ed.warn}</span>` : 'Fotografa sobre uma folha branca ou cartolina lisa, com boa luz, para o melhor recorte.'}</div></div>` : ''}`}
        <div class="pad"><button class="btn secondary" data-act="ph-retake">${icon('camera')}Tirar outra</button></div>`,
    });
    let t;
    on('ph-mode', (el) => { segTap(el); auto = el.dataset.value === 'auto'; setTimeout(() => { compute(); sheet.update(); }, 60); });
    on('ph-strength', (el) => {
      strength = +el.value;
      clearTimeout(t);
      t = setTimeout(() => { compute(); const img = sheet.body.querySelector('.photo-box img'); if (img) img.src = result; const f = sheet.body.querySelector('.section-footer'); if (f) f.innerHTML = ed.warn ? `<span style="color:var(--orange)">${ed.warn}</span>` : 'Fotografa sobre uma folha branca ou cartolina lisa, com boa luz, para o melhor recorte.'; }, 120);
    });
    on('ph-retake', async () => {
      const file = await pickFile('image/*');
      if (!file) return;
      try { src = await loadPhoto(file); } catch { return; }
      compute(); sheet.update();
    });
    compute();
    sheet.update();
  });
}

// ---------- Photo session: photo -> part -> skin -> next ----------
const session = {
  active: false, photo: null, pickerSheet: null, partSheet: null,
  async start() {
    const url = await takePhoto();
    if (!url) { this.active = false; return; }
    this.active = true; this.photo = url;
    this.openPicker();
  },
  openPicker() {
    let q = '';
    const list = () => {
      const nq = norm(q.trim());
      const res = catalog.filter((p) => !nq || norm(p.name).includes(nq)).slice(0, 80);
      return res.map((p) => `<button class="row" data-act="ses-part" data-id="${p.id}" style="--inset:72px">
        <span class="thumb" style="display:grid;place-items:center;overflow:hidden">${partImg(p.id, 40)}</span>
        <div class="body"><div class="title">${esc(p.name)}</div><div class="sub">${TYPES[p.type]}${p.line ? ` · ${esc(p.line)}` : ''} · ${skinsOf(p.id).length} skins</div></div>${icon('chevR', 'chev')}</button>`).join('');
    };
    this.pickerSheet = openSheet({
      title: 'Que peça é?',
      left: { label: 'Cancelar' },
      onClose: (r) => { if (r !== 'next') this.active = false; },
      render: () => `
        <div class="photo-box small"><img src="${this.photo}" alt=""></div>
        <label class="search">${icon('search')}<input type="search" placeholder="Procurar peça" data-input="ses-search" autocomplete="off"></label>
        <div class="section"><div class="list" id="ses-list">${list()}</div></div>`,
    });
    on('ses-search', (el) => { q = el.value; this.pickerSheet.body.querySelector('#ses-list').innerHTML = list(); });
  },
  pickSkin(partId, skin) {
    const existing = skin ? entryForSkin(partId, skin.k) : null;
    const entry = existing ? { ...existing } : newEntry(partId, skin);
    if (existing) entry.qty = existing.qty; // same skin again: the editor lets you raise the quantity
    entry._photo = this.photo;
    this.active = false;
    this.partSheet?.close('next');
    this.pickerSheet?.close('next');
    openSkin(entry, {
      isNew: !existing, skin,
      onSaved: () => toast('Guardado na coleção', { icon: 'star', action: 'Próxima foto', ms: 6000, onAction: () => session.start() }),
    });
  },
};
on('col-session', () => session.start());
on('ses-part', (el) => { session.partSheet = openPart(el.dataset.id, { pick: true }); });
