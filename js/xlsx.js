// Minimal .xlsx writer (no library, works offline). Supports numbers, text,
// dates, formulas with cached values, a fixed set of styles, column widths,
// frozen header rows, autofilter and green/red conditional formatting.

/** Style ids usable in cells (`s`). */
export const S = { text: 0, header: 1, eur: 2, jpy: 3, date: 4, eurBold: 5, bold: 6, int: 7, title: 8, rate: 9, month: 10 };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  // XML 1.0 forbids most control characters.
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');

export function colName(i) { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }

/** 'YYYY-MM-DD' -> Excel serial day number. */
export function dateSerial(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000;
}

/**
 * Cell: null | number | string | { v, f, s }.
 * `v` is the value (or the cached result of formula `f`); `s` a style id from S.
 */
function cellXml(ref, c) {
  if (c === null || c === undefined || c === '') return '';
  if (typeof c !== 'object') c = { v: c };
  const s = c.s ? ` s="${c.s}"` : '';
  const f = c.f ? `<f>${esc(c.f)}</f>` : '';
  if (typeof c.v === 'number' && Number.isFinite(c.v)) return `<c r="${ref}"${s}>${f}<v>${c.v}</v></c>`;
  if (typeof c.v === 'string' && c.v !== '') {
    return c.f ? `<c r="${ref}"${s} t="str">${f}<v>${esc(c.v)}</v></c>`
      : `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(c.v)}</t></is></c>`;
  }
  return c.f ? `<c r="${ref}"${s}>${f}</c>` : (c.s ? `<c r="${ref}"${s}/>` : '');
}

function sheetXml(sh) {
  const rows = sh.rows.map((row, ri) => {
    if (!row) return '';
    const cells = row.map((c, ci) => cellXml(`${colName(ci)}${ri + 1}`, c)).join('');
    return cells ? `<row r="${ri + 1}">${cells}</row>` : '';
  }).join('');
  const freeze = sh.freezeRow ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${sh.freezeRow}" topLeftCell="A${sh.freezeRow + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` : '';
  const cols = sh.cols ? `<cols>${sh.cols.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
  const filter = sh.autoFilter ? `<autoFilter ref="${sh.autoFilter}"/>` : '';
  let prio = 1;
  const cf = (sh.posNeg || []).map((ref) => `<conditionalFormatting sqref="${ref}">
    <cfRule type="cellIs" dxfId="0" priority="${prio++}" operator="greaterThan"><formula>0</formula></cfRule>
    <cfRule type="cellIs" dxfId="1" priority="${prio++}" operator="lessThan"><formula>0</formula></cfRule></conditionalFormatting>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${freeze}${cols}<sheetData>${rows}</sheetData>${filter}${cf}</worksheet>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="5"><numFmt numFmtId="168" formatCode="mmm yyyy"/><numFmt numFmtId="164" formatCode="#,##0.00\\ &quot;€&quot;"/><numFmt numFmtId="165" formatCode="&quot;¥&quot;#,##0"/><numFmt numFmtId="166" formatCode="dd/mm/yyyy"/><numFmt numFmtId="167" formatCode="0.000000"/></numFmts>
<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="14"/><color rgb="FF5E5CE6"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE9E9EF"/></patternFill></fill></fills>
<borders count="2"><border/><border><bottom style="thin"><color rgb="FFB0B0B8"/></bottom></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="11">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="167" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="168" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
<dxfs count="2"><dxf><font><color rgb="FF1E8E3E"/></font></dxf><dxf><font><color rgb="FFD93025"/></font></dxf></dxfs>
</styleSheet>`;

// ---------- zip (stored, no compression) ----------
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

function zip(files) {
  const enc = new TextEncoder();
  const parts = [], central = [];
  let offset = 0;
  for (const [name, text] of files) {
    const data = enc.encode(text), nameB = enc.encode(name), crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x0800, true);
    local.setUint32(14, crc, true); local.setUint32(18, data.length, true); local.setUint32(22, data.length, true);
    local.setUint16(26, nameB.length, true);
    parts.push(new Uint8Array(local.buffer), nameB, data);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true); cen.setUint16(4, 20, true); cen.setUint16(6, 20, true); cen.setUint16(8, 0x0800, true);
    cen.setUint32(16, crc, true); cen.setUint32(20, data.length, true); cen.setUint32(24, data.length, true);
    cen.setUint16(28, nameB.length, true); cen.setUint32(42, offset, true);
    central.push(new Uint8Array(cen.buffer), nameB);
    offset += 30 + nameB.length + data.length;
  }
  const cenSize = central.reduce((s, p) => s + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cenSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/** sheets: [{ name, rows, cols?, freezeRow?, autoFilter?, posNeg? }] -> Blob */
export function buildXlsx(sheets) {
  const names = sheets.map((s) => esc(s.name.slice(0, 31)));
  const files = [
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', STYLES],
    ...sheets.map((s, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s)]),
  ];
  return zip(files);
}
