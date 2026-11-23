import type { History } from './ipc/types';
import { currentLocale } from './locale.ts';
import { m } from '../paraglide/messages.js';
import { formatRangeLabel, type ExportRange } from './export-range.ts';
import { PROJECT_URL } from './project.ts';
import { sessionsSheet, safeSheetName, stylesXml, summarySheet } from './xlsx-report.ts';
import { HYPERLINK_REL, REL_NS, XML_HEADER, escapeXml } from './xlsx-xml.ts';

type ZipEntry = {
  name: string;
  data: Uint8Array;
};

type ZipSource = {
  name: Uint8Array;
  data: Uint8Array;
  checksum: number;
  method: number;
  uncompressedSize: number;
};

type ZipStamp = {
  time: number;
  date: number;
};

export { columnName, escapeXml } from './xlsx-xml.ts';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

/** Standard CRC-32 used by every ZIP entry. */
export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function localEntry(source: ZipSource, stamp: ZipStamp): Uint8Array {
  const { name, data, checksum } = source;
  const local = new Uint8Array(30 + name.length + data.length);
  const view = new DataView(local.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0800, true);
  view.setUint16(8, source.method, true);
  view.setUint16(10, stamp.time, true);
  view.setUint16(12, stamp.date, true);
  view.setUint32(14, checksum, true);
  view.setUint32(18, data.length, true);
  view.setUint32(22, source.uncompressedSize, true);
  view.setUint16(26, name.length, true);
  view.setUint16(28, 0, true);
  local.set(name, 30);
  local.set(data, 30 + name.length);
  return local;
}

function centralEntry(source: ZipSource, offset: number, stamp: ZipStamp): Uint8Array {
  const { name, data, checksum } = source;
  const central = new Uint8Array(46 + name.length);
  const view = new DataView(central.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0x0800, true);
  view.setUint16(10, source.method, true);
  view.setUint16(12, stamp.time, true);
  view.setUint16(14, stamp.date, true);
  view.setUint32(16, checksum, true);
  view.setUint32(20, data.length, true);
  view.setUint32(24, source.uncompressedSize, true);
  view.setUint16(28, name.length, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, offset, true);
  central.set(name, 46);
  return central;
}

function endRecord(count: number, centralSize: number, offset: number): Uint8Array {
  const end = new Uint8Array(22);
  const view = new DataView(end.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, count, true);
  view.setUint16(10, count, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, offset, true);
  view.setUint16(20, 0, true);
  return end;
}

/** Deflates when the webview supports it, otherwise stores the bytes as-is. */
async function deflate(data: Uint8Array): Promise<{ data: Uint8Array; method: number }> {
  if (typeof CompressionStream === 'undefined') {
    return { data, method: 0 };
  }
  try {
    const stream = new Blob([new Uint8Array(data)])
      .stream()
      .pipeThrough(new CompressionStream('deflate-raw'));
    const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
    return { data: compressed, method: 8 };
  } catch {
    return { data, method: 0 };
  }
}

/** Builds a ZIP archive, compressing each entry when enabled and supported. */
export async function zipStore(files: ZipEntry[], compress = true): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  const stamp = dosTimestamp(new Date());

  for (const file of files) {
    const compressed = compress ? await deflate(file.data) : { data: file.data, method: 0 };
    const source: ZipSource = {
      name: encoder.encode(file.name),
      data: compressed.data,
      checksum: crc32(file.data),
      method: compressed.method,
      uncompressedSize: file.data.length,
    };
    const local = localEntry(source, stamp);
    locals.push(local);
    centrals.push(centralEntry(source, offset, stamp));
    offset += local.length;
  }

  const centralSize = centrals.reduce((total, entry) => total + entry.length, 0);
  return concat([...locals, ...centrals, endRecord(files.length, centralSize, offset)]);
}

function dosTimestamp(when: Date): { time: number; date: number } {
  const time =
    (when.getHours() << 11) | (when.getMinutes() << 5) | Math.floor(when.getSeconds() / 2);
  const date = ((when.getFullYear() - 1980) << 9) | ((when.getMonth() + 1) << 5) | when.getDate();
  return { time, date };
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((size, part) => size + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

export interface WorkbookOptions {
  onProgress?: (done: number, total: number) => void;
  signal?: AbortSignal;
  /** Tests disable compression so the XML stays inspectable. */
  compress?: boolean;
}

function sheetRels(): string {
  return `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${HYPERLINK_REL}" Target="${escapeXml(PROJECT_URL)}" TargetMode="External"/></Relationships>`;
}

/** Builds a styled two-sheet workbook for the selected local range. */
export async function buildWorkbook(
  history: History,
  range: ExportRange,
  now = new Date(),
  options: WorkbookOptions = {},
): Promise<Uint8Array> {
  const locale = currentLocale();
  const generated = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(now);
  const created = now.toISOString();
  const rangeLabel = formatRangeLabel(range, locale);
  const summaryName = safeSheetName(m['export.summary'](), 'Summary');
  const sessionsName = safeSheetName(m['export.sessions'](), 'Sessions');
  const summary = await summarySheet(history, locale, generated, range);
  const sessions = await sessionsSheet(history, { locale, generated, range }, options);
  const encoder = new TextEncoder();

  const contentTypes = `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`;
  const rootRels = `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL_NS}/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="${REL_NS}/extended-properties" Target="docProps/app.xml"/></Relationships>`;
  const workbook = `${XML_HEADER}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${REL_NS}"><bookViews><workbookView activeTab="0"/></bookViews><sheets><sheet name="${escapeXml(summaryName)}" sheetId="1" r:id="rId1"/><sheet name="${escapeXml(sessionsName)}" sheetId="2" r:id="rId2"/></sheets></workbook>`;
  const workbookRels = `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL_NS}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${REL_NS}/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="${REL_NS}/styles" Target="styles.xml"/></Relationships>`;
  const title = escapeXml(`${m['app.name']()} · ${m['export.workbookTitle']()} · ${rangeLabel}`);
  const core = `${XML_HEADER}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${title}</dc:title><dc:subject>${escapeXml(rangeLabel)}</dc:subject><dc:creator>${m['app.name']()}</dc:creator><cp:keywords>${PROJECT_URL}</cp:keywords><cp:lastModifiedBy>${m['app.name']()}</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${created}</dcterms:modified></cp:coreProperties>`;
  const app = `${XML_HEADER}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>${m['app.name']()}</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><Company>Siderkit</Company><LinksUpToDate>false</LinksUpToDate><SharedDoc>false</SharedDoc><HyperlinksChanged>false</HyperlinksChanged><AppVersion>1.0</AppVersion></Properties>`;

  return zipStore(
    [
      { name: '[Content_Types].xml', data: encoder.encode(contentTypes) },
      { name: '_rels/.rels', data: encoder.encode(rootRels) },
      { name: 'docProps/core.xml', data: encoder.encode(core) },
      { name: 'docProps/app.xml', data: encoder.encode(app) },
      { name: 'xl/workbook.xml', data: encoder.encode(workbook) },
      { name: 'xl/_rels/workbook.xml.rels', data: encoder.encode(workbookRels) },
      { name: 'xl/styles.xml', data: encoder.encode(stylesXml()) },
      { name: 'xl/worksheets/sheet1.xml', data: encoder.encode(summary) },
      { name: 'xl/worksheets/sheet2.xml', data: encoder.encode(sessions) },
      { name: 'xl/worksheets/_rels/sheet1.xml.rels', data: encoder.encode(sheetRels()) },
      { name: 'xl/worksheets/_rels/sheet2.xml.rels', data: encoder.encode(sheetRels()) },
    ],
    options.compress ?? true,
  );
}
