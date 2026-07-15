// exceljs is loaded on demand (see exportPurchaseExcel) so it stays out of the
// initial bundle and only downloads when a user actually exports.

// ---- Date range presets for the export dialog ------------------------------
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

export const getExportRange = (type, customStart, customEnd) => {
  const now = new Date();
  switch (type) {
    case 'daily':
      return { start: startOfDay(now), end: endOfDay(now), label: `Daily — ${fmtDate(now)}` };
    case 'weekly': {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1; // Monday start
      const mon = new Date(now); mon.setDate(now.getDate() - diff);
      return { start: startOfDay(mon), end: endOfDay(now), label: `Weekly — ${fmtDate(mon)} to ${fmtDate(now)}` };
    }
    case 'monthly': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: startOfDay(s), end: endOfDay(now), label: `Monthly — ${now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}` };
    }
    case 'quarterly': {
      const q = Math.floor(now.getMonth() / 3);
      const s = new Date(now.getFullYear(), q * 3, 1);
      return { start: startOfDay(s), end: endOfDay(now), label: `Quarterly — Q${q + 1} ${now.getFullYear()}` };
    }
    case 'yearly': {
      const s = new Date(now.getFullYear(), 0, 1);
      return { start: startOfDay(s), end: endOfDay(now), label: `Yearly — ${now.getFullYear()}` };
    }
    case 'custom':
      if (!customStart && !customEnd) return null;
      return {
        start: customStart ? startOfDay(new Date(customStart)) : new Date(0),
        end: customEnd ? endOfDay(new Date(customEnd)) : endOfDay(now),
        label: `Custom — ${customStart ? fmtDate(customStart) : 'Start'} to ${customEnd ? fmtDate(customEnd) : fmtDate(now)}`,
      };
    default:
      return null;
  }
};

// ---- Helpers ---------------------------------------------------------------
function fmtDate(d) {
  if (!d) return '';
  const x = new Date(d);
  if (isNaN(x.getTime())) return '';
  return `${String(x.getDate()).padStart(2, '0')}-${String(x.getMonth() + 1).padStart(2, '0')}-${x.getFullYear()}`;
}
const stockLabel = (a) => (a <= 0 ? 'Out of Stock' : a <= 5 ? 'Low Stock' : 'In Stock');

// Column definitions (order matters). `total: true` columns are summed.
const COLUMNS = [
  { header: 'Purchase ID', width: 26 },
  { header: 'Purchase Date', width: 14 },
  { header: 'Product Name', width: 32 },
  { header: 'Storage Location', width: 22 },
  { header: 'Supplier / Vendor', width: 20 },
  { header: 'Invoice Number', width: 16 },
  { header: 'Quantity Purchased', width: 16, num: true, total: true },
  { header: 'Unit', width: 10 },
  { header: 'Unit Price', width: 12, num: true, money: true },
  { header: 'Total Amount', width: 15, num: true, money: true, total: true },
  { header: 'Dispatch Quantity', width: 15, num: true, total: true },
  { header: 'Dispatch Date', width: 20 },
  { header: 'Job Number(s)', width: 22 },
  { header: 'Returned Quantity', width: 15, num: true, total: true },
  { header: 'Return Date', width: 20 },
  { header: 'Available Stock', width: 14, num: true, total: true },
  { header: 'Purchase Status', width: 14 },
  { header: 'Created By', width: 16 },
  { header: 'Remarks', width: 32 },
];

const rowFor = (e) => {
  const dispatches = e.dispatches || [];
  const returns = e.returns || [];
  return [
    e._id || '',
    fmtDate(e.purchaseDate || e.createdAt),
    e.itemName || '',
    e.storageLocation || '',
    e.supplier || '',
    e.invoiceNumber || '',
    e.quantityPurchased || 0,
    e.unit || '',
    e.unitPrice || 0,
    e.totalAmount || 0,
    e.totalDispatched || 0,
    dispatches.map((d) => fmtDate(d.dispatchDate)).filter(Boolean).join(', '),
    [...new Set(dispatches.map((d) => d.jobNumber).filter(Boolean))].join(', '),
    e.totalReturned || 0,
    returns.map((r) => fmtDate(r.returnDate)).filter(Boolean).join(', '),
    e.availableStock || 0,
    stockLabel(e.availableStock || 0),
    e.createdByUsername || e.createdBy?.username || e.createdByName || '',
    e.remarks || '',
  ];
};

const THIN = { style: 'thin', color: { argb: 'FFD1D5DB' } };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };

// ---- Main export -----------------------------------------------------------
export async function exportPurchaseExcel({ entries, periodLabel }) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'OmTrax CRM';
  wb.created = new Date();
  const ws = wb.addWorksheet('Purchase Report', {
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  const colCount = COLUMNS.length;

  // Row 1 — Title
  ws.mergeCells(1, 1, 1, colCount);
  const title = ws.getCell(1, 1);
  title.value = 'OmTrax — Purchase & Inventory Report';
  title.font = { size: 16, bold: true, color: { argb: 'FF065F46' } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  // Row 2 — Period + generation date
  ws.mergeCells(2, 1, 2, colCount);
  const sub = ws.getCell(2, 1);
  sub.value = `Report Period: ${periodLabel}     |     Generated: ${new Date().toLocaleString('en-IN')}     |     Records: ${entries.length}`;
  sub.font = { size: 10, italic: true, color: { argb: 'FF6B7280' } };
  sub.alignment = { horizontal: 'center' };

  // Row 4 — Header
  const HEADER_ROW = 4;
  const header = ws.getRow(HEADER_ROW);
  COLUMNS.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = BORDER;
  });
  header.height = 24;

  // Data rows
  const totals = new Array(colCount).fill(0);
  entries.forEach((e, idx) => {
    const values = rowFor(e);
    const row = ws.addRow(values);
    row.eachCell((cell, col) => {
      const def = COLUMNS[col - 1];
      cell.border = BORDER;
      cell.alignment = { vertical: 'middle', horizontal: def.num ? 'right' : 'left', wrapText: col === 3 || col === colCount };
      if (def.money) cell.numFmt = '#,##0.00';
      else if (def.num) cell.numFmt = '#,##0';
      if (idx % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
      if (def.total) totals[col - 1] += Number(values[col - 1]) || 0;
    });
  });

  // Totals row
  const totalValues = COLUMNS.map((c, i) => {
    if (i === 0) return 'TOTAL';
    return c.total ? totals[i] : '';
  });
  const totalRow = ws.addRow(totalValues);
  totalRow.eachCell((cell, col) => {
    const def = COLUMNS[col - 1];
    cell.font = { bold: true, color: { argb: 'FF065F46' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
    cell.border = BORDER;
    cell.alignment = { vertical: 'middle', horizontal: def.num ? 'right' : 'left' };
    if (def.money) cell.numFmt = '#,##0.00';
    else if (def.num) cell.numFmt = '#,##0';
  });

  // Column widths — start from defined widths, then auto-expand to content (capped)
  COLUMNS.forEach((c, i) => {
    const column = ws.getColumn(i + 1);
    let max = c.width;
    column.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
      if (rowNumber <= 3) return; // ignore merged title/period rows
      const len = cell.value ? String(cell.value).length + 2 : 0;
      if (len > max) max = len;
    });
    column.width = Math.min(Math.max(max, 10), 45);
  });

  // Download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = fmtDate(new Date()).replace(/-/g, '');
  const safe = (periodLabel || 'Report').split('—')[0].trim().replace(/\s+/g, '_');
  a.href = url;
  a.download = `OmTrax_Purchase_${safe}_${stamp}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
