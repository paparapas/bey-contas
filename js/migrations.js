// One-off data fixes for items imported from the Excel (ids "x<row>").
// Only rows still exactly as imported (updatedAt = the import file's timestamp)
// are touched, so anything edited by hand is left alone. Safe to run often:
// a fixed row gets a new updatedAt and is never matched again.
import { state, commit } from './store.js';

// Timestamp of the first Excel import file (dados-iniciais-excel.json, 29/10).
const FIRST_IMPORT_TS = 1793243983177;

// In stock = only rows with a value in "Predicted Ongoing" (column T) and no
// sale price. Value = that Predicted Ongoing amount.
const STOCK = { x135: 140, x145: 17, x148: 25, x170: 25, x171: 15, x173: 16 };

/** Returns how many items changed. */
export function migrateStockRule() {
  let changed = 0;
  const now = Date.now();
  for (const it of state.items) {
    if (!it.id.startsWith('x') || it.updatedAt !== FIRST_IMPORT_TS) continue;
    if (it.status === 'sold' || it.status === 'gifted') continue;
    if (STOCK[it.id]) Object.assign(it, { status: 'stock', estPrice: STOCK[it.id] });
    else Object.assign(it, { status: 'kept', estPrice: null });
    it.review = null;
    it.updatedAt = now;
    changed++;
  }
  if (changed) commit();
  return changed;
}

/**
 * Fills in purchase / sale dates from a dates file ({ id: { buy, sale } }),
 * e.g. the one recovered from the Excel's OneDrive version history. Only empty
 * dates are filled, so dates typed in the app are never overwritten.
 * Returns how many items changed.
 */
export function applyDates(dates) {
  let changed = 0;
  const now = Date.now();
  for (const it of state.items) {
    const d = dates[it.id];
    if (!d) continue;
    let touched = false;
    if (d.buy && !it.buyDate) { it.buyDate = d.buy; touched = true; }
    if (d.sale && it.status === 'sold' && !it.saleDate) { it.saleDate = d.sale; touched = true; }
    if (touched) { it.updatedAt = now; changed++; }
  }
  if (changed) commit();
  return changed;
}
