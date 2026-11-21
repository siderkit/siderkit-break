export const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
export const MAIN_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
export const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
export const HYPERLINK_REL = `${REL_NS}/hyperlink`;

/** Fixed report palette: calm teal ink, cream paper, coral accents. */
export const REPORT_COLORS = {
  ink: 'FF1C2B26',
  brand: 'FF1F4D44',
  brandDeep: 'FF143E35',
  cream: 'FFF7F3EA',
  mint: 'FFEAF2ED',
  white: 'FFFFFFFF',
  line: 'FFE3DCCD',
  muted: 'FF6B7770',
  green: 'FF2F6B4F',
  amber: 'FFB26A2E',
  coral: 'FFC8664A',
} as const;

export type CellValue = string | number;

/** Escapes text for XML text nodes and attributes. */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Converts a zero-based column index into an Excel column name. */
export function columnName(index: number): string {
  let value = index + 1;
  let name = '';
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

export function cell(reference: string, value: CellValue, style: number): string {
  if (typeof value === 'number') {
    return `<c r="${reference}" s="${style}"><v>${value}</v></c>`;
  }
  return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

export function row(index: number, values: CellValue[], style: number, height?: number): string {
  const cells = values
    .map((value, column) => cell(`${columnName(column)}${index}`, value, style))
    .join('');
  const size = height ? ` ht="${height}" customHeight="1"` : '';
  return `<row r="${index}"${size}>${cells}</row>`;
}

export function sectionRow(index: number, label: string, height: number): string {
  const reference = `A${index}`;
  return `<row r="${index}" ht="${height}" customHeight="1">${cell(reference, label, 3)}</row>`;
}

function column(width: number, index: number): string {
  const position = index + 1;
  return `<col min="${position}" max="${position}" width="${width}" customWidth="1"/>`;
}

export function columns(widths: number[]): string {
  return `<cols>${widths.map(column).join('')}</cols>`;
}

function mergeCell(range: string): string {
  return `<mergeCell ref="${range}"/>`;
}

function mergeCells(ranges: string[]): string {
  return `<mergeCells count="${ranges.length}">${ranges.map(mergeCell).join('')}</mergeCells>`;
}

export function sheetXml(options: {
  dimension: string;
  columns: number[];
  rows: string[];
  freeze: { rows: number; topLeft: string };
  autoFilter?: string | undefined;
  merges: string[];
  hyperlinks?: Array<{ ref: string; target: string }> | undefined;
  printHeader?: string | undefined;
}): string {
  const merges = options.merges.length > 0 ? mergeCells(options.merges) : '';
  const filter = options.autoFilter ? `<autoFilter ref="${options.autoFilter}"/>` : '';
  const hyperlinks =
    options.hyperlinks && options.hyperlinks.length > 0
      ? `<hyperlinks>${options.hyperlinks
          .map((link, index) => `<hyperlink ref="${link.ref}" r:id="rId${index + 1}"/>`)
          .join('')}</hyperlinks>`
      : '';
  const printHeader = options.printHeader
    ? `<headerFooter><oddHeader>${escapeXml('&L' + options.printHeader)}</oddHeader></headerFooter>`
    : '';
  return [
    XML_HEADER,
    `<worksheet xmlns="${MAIN_NS}" xmlns:r="${REL_NS}">`,
    '<sheetPr><tabColor rgb="' + REPORT_COLORS.brand + '"/></sheetPr>',
    `<dimension ref="${options.dimension}"/>`,
    '<sheetViews><sheetView showGridLines="0" workbookViewId="0">',
    `<pane ySplit="${options.freeze.rows}" topLeftCell="${options.freeze.topLeft}" activePane="bottomLeft" state="frozen"/>`,
    '</sheetView></sheetViews>',
    '<sheetFormatPr defaultRowHeight="18"/>',
    columns(options.columns),
    `<sheetData>${options.rows.join('')}</sheetData>`,
    filter,
    merges,
    hyperlinks,
    '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>',
    printHeader,
    '</worksheet>',
  ].join('');
}
