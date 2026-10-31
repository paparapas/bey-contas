// Removes a plain background from a photo, on the device, without any model:
// the background colour is read from the photo's border and flood-filled
// inwards; the edge is softened, the result cropped to the object and shrunk.
// Photos that already have transparency (e.g. iPhone "Copy subject") are kept.

const WORK = 720;   // longest side while processing
const OUT = 360;    // longest side of the saved photo

/** File -> canvas scaled to WORK px. */
export async function loadPhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Não foi possível abrir a imagem'));
      i.src = url;
    });
    const k = Math.min(1, WORK / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c;
  } finally { URL.revokeObjectURL(url); }
}

/** True when the image already has a transparent background. */
export function hasTransparency(src) {
  const { data, width, height } = src.getContext('2d').getImageData(0, 0, src.width, src.height);
  let clear = 0, n = 0;
  const at = (x, y) => data[(y * width + x) * 4 + 3];
  for (let x = 0; x < width; x += 4) { n += 2; if (at(x, 0) < 30) clear++; if (at(x, height - 1) < 30) clear++; }
  for (let y = 0; y < height; y += 4) { n += 2; if (at(0, y) < 30) clear++; if (at(width - 1, y) < 30) clear++; }
  return clear / n > 0.5;
}

/**
 * Background removal. `strength` 0–100 (how different from the background a
 * pixel must be to count as the object). Returns a canvas with alpha plus the
 * share of the picture kept as object.
 */
export function removeBackground(src, strength = 45) {
  const w = src.width, h = src.height;
  const ctx = src.getContext('2d');
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  // Background colours: border pixels grouped into a few buckets (uneven light / shadows).
  const buckets = new Map();
  const addSample = (x, y) => {
    const i = (y * w + x) * 4;
    const key = `${d[i] >> 4},${d[i + 1] >> 4},${d[i + 2] >> 4}`;
    const b = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0 };
    b.r += d[i]; b.g += d[i + 1]; b.b += d[i + 2]; b.n++;
    buckets.set(key, b);
  };
  for (let x = 0; x < w; x += 2) { addSample(x, 0); addSample(x, h - 1); }
  for (let y = 0; y < h; y += 2) { addSample(0, y); addSample(w - 1, y); }
  const total = [...buckets.values()].reduce((s, b) => s + b.n, 0);
  const bg = [...buckets.values()].sort((a, b) => b.n - a.n).filter((b) => b.n / total > 0.04).slice(0, 6)
    .map((b) => [b.r / b.n, b.g / b.n, b.b / b.n]);

  const tol = 10 + strength * 0.9;          // colour distance threshold
  const tol2 = tol * tol;
  const dist2 = (i) => {
    let best = Infinity;
    for (const [r, g, b] of bg) {
      const dr = d[i] - r, dg = d[i + 1] - g, db = d[i + 2] - b;
      const v = 0.3 * dr * dr + 0.59 * dg * dg + 0.11 * db * db;
      if (v < best) best = v;
    }
    return best;
  };

  // Flood fill from every border pixel through background-coloured pixels.
  const isBg = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0, tail = 0;
  const push = (p) => { if (!isBg[p] && dist2(p * 4) < tol2) { isBg[p] = 1; queue[tail++] = p; } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (head < tail) {
    const p = queue[head++], x = p % w, y = (p / w) | 0;
    if (x > 0) push(p - 1); if (x < w - 1) push(p + 1);
    if (y > 0) push(p - w); if (y < h - 1) push(p + w);
  }

  // Alpha: background 0; pixels next to the background get a soft edge.
  let kept = 0, minX = w, minY = h, maxX = 0, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (isBg[p]) { d[p * 4 + 3] = 0; continue; }
      const edge = (x > 0 && isBg[p - 1]) || (x < w - 1 && isBg[p + 1]) || (y > 0 && isBg[p - w]) || (y < h - 1 && isBg[p + w]);
      if (edge) d[p * 4 + 3] = Math.min(255, Math.round(255 * Math.sqrt(dist2(p * 4)) / (tol * 1.6)));
      kept++;
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  out.getContext('2d').putImageData(img, 0, 0);
  return { canvas: out, kept: kept / (w * h), box: kept ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } : null };
}

/** Crop to the object (with a small margin), shrink to OUT px and encode. */
export function finish(canvas, box) {
  const b = box || { x: 0, y: 0, w: canvas.width, h: canvas.height };
  const m = Math.round(Math.max(b.w, b.h) * 0.04);
  const x = Math.max(0, b.x - m), y = Math.max(0, b.y - m);
  const cw = Math.min(canvas.width - x, b.w + 2 * m), ch = Math.min(canvas.height - y, b.h + 2 * m);
  const k = Math.min(1, OUT / Math.max(cw, ch));
  const out = document.createElement('canvas');
  out.width = Math.round(cw * k); out.height = Math.round(ch * k);
  const ctx = out.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, x, y, cw, ch, 0, 0, out.width, out.height);
  const webp = out.toDataURL('image/webp', 0.86);
  return webp.startsWith('data:image/webp') ? webp : out.toDataURL('image/png');
}

/** Bounding box of the non-transparent pixels of a canvas. */
export function opaqueBox(canvas) {
  const { data, width, height } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] > 20) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  return maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
