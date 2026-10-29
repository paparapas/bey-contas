// All data lives on this device (IndexedDB). Other devices get it through a
// backup file that is merged record by record: the newest edit wins and
// deletions travel as tombstones, so importing twice never duplicates.

const DB_NAME = 'bey-contas';
const KV = 'kv';
export const COLLECTIONS = ['items', 'orders', 'collection', 'inbox'];

export const state = {
  items: [],       // one row per unit bought
  orders: [],      // purchases that share shipping / customs
  collection: [],  // parts kept for the personal collection
  inbox: [],       // platform sales still to review ("Rever")
  deleted: {},     // "collection:id" -> deletedAt
  settings: { rate: 0.0058, rateDate: null, vat: 0.23, lastBackup: null, updatedAt: 0 },
};

let db;
function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(KV);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function kv(mode, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(KV, mode);
    const req = fn(tx.objectStore(KV));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
  });
}

export async function load() {
  try {
    db = await open();
    const saved = await kv('readonly', (s) => s.get('state'));
    if (saved) {
      for (const k of Object.keys(state)) if (saved[k] !== undefined) state[k] = saved[k];
      state.settings = { ...stateDefaults().settings, ...saved.settings };
    }
  } catch (e) {
    console.warn('IndexedDB indisponível, a usar memória', e);
  }
  navigator.storage?.persist?.().catch(() => {});
}
function stateDefaults() {
  return { settings: { rate: 0.0058, rateDate: null, vat: 0.23, lastBackup: null, updatedAt: 0 } };
}

const listeners = new Set();
export const subscribe = (fn) => listeners.add(fn);

let saveTimer;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (!db) return;
    const snapshot = JSON.parse(JSON.stringify(state));
    kv('readwrite', (s) => s.put(snapshot, 'state')).catch((e) => console.error(e));
  }, 120);
}
export function commit() {
  persist();
  listeners.forEach((fn) => fn());
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export function find(coll, id) {
  return state[coll].find((x) => x.id === id);
}
export function upsert(coll, obj, { silent } = {}) {
  obj.updatedAt = Date.now();
  if (!obj.id) obj.id = uid();
  const i = state[coll].findIndex((x) => x.id === obj.id);
  if (i >= 0) state[coll][i] = obj;
  else state[coll].unshift(obj);
  if (!silent) commit();
  return obj;
}
export function remove(coll, id, { silent } = {}) {
  state[coll] = state[coll].filter((x) => x.id !== id);
  state.deleted[`${coll}:${id}`] = Date.now();
  if (!silent) commit();
}
export function setSettings(patch) {
  Object.assign(state.settings, patch, { updatedAt: Date.now() });
  commit();
}

// ---------- Backup / sync ----------

export function exportData() {
  return {
    app: 'bey-contas',
    version: 1,
    exportedAt: Date.now(),
    items: state.items,
    orders: state.orders,
    collection: state.collection,
    inbox: state.inbox,
    deleted: state.deleted,
    settings: state.settings,
  };
}

/** Merges a backup into this device. Returns how many records changed. */
export function merge(data) {
  if (!data || data.app !== 'bey-contas') throw new Error('Este ficheiro não é uma cópia do Bey Contas.');
  const res = { added: 0, updated: 0, removed: 0 };
  const deleted = { ...state.deleted };
  for (const [key, ts] of Object.entries(data.deleted || {})) deleted[key] = Math.max(deleted[key] || 0, ts);

  for (const coll of COLLECTIONS) {
    const map = new Map(state[coll].map((x) => [x.id, x]));
    for (const inc of data[coll] || []) {
      if ((deleted[`${coll}:${inc.id}`] || 0) >= (inc.updatedAt || 0)) continue;
      const local = map.get(inc.id);
      if (!local) { map.set(inc.id, inc); res.added++; }
      else if ((inc.updatedAt || 0) > (local.updatedAt || 0)) { map.set(inc.id, inc); res.updated++; }
    }
    for (const [id, x] of map) {
      const ts = deleted[`${coll}:${id}`];
      if (ts && ts >= (x.updatedAt || 0)) { map.delete(id); res.removed++; }
    }
    state[coll] = [...map.values()];
  }
  state.deleted = deleted;
  if (data.settings && (data.settings.updatedAt || 0) > (state.settings.updatedAt || 0)) {
    state.settings = { ...state.settings, ...data.settings, lastBackup: state.settings.lastBackup };
  }
  commit();
  return res;
}

export function wipe() {
  for (const coll of COLLECTIONS) state[coll] = [];
  state.deleted = {};
  state.settings = stateDefaults().settings;
  commit();
}
