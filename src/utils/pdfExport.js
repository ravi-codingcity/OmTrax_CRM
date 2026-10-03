/**
 * PDF generation for Purchase Orders and Rate Comparisons.
 *
 * jsPDF is imported on demand — the same pattern the Excel export already uses —
 * so it stays out of the initial bundle and only downloads when someone actually
 * exports something.
 */

import { COMPANY } from '../config/company.js';
import { comparisonView, lineFor } from '../config/rateComparison.js';

const fmtDate = (d) => {
  if (!d) return '—';
  const x = new Date(d);
  return isNaN(x.getTime())
    ? '—'
    : `${String(x.getDate()).padStart(2, '0')}-${String(x.getMonth() + 1).padStart(2, '0')}-${x.getFullYear()}`;
};

// jsPDF's core fonts are Latin-1, so a literal ₹ renders as a black box.
// "Rs." is the readable, dependency-free alternative.
const money = (n) =>
  `Rs. ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const BRAND = [180, 83, 9];       // amber-700
const INK = [31, 41, 55];
const MUTED = [107, 114, 128];

const loadPdf = async () => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  return { jsPDF, autoTable };
};

/** Shared header block: company mark, document title, reference number. */
const drawHeader = (doc, { title, reference, date, accent }) => {
  doc.setFillColor(...accent);
  doc.rect(0, 0, 210, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('OmTrax', 14, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Relocation · HR · Purchase', 14, 17.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title, 196, 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(reference || '', 196, 18, { align: 'right' });
  if (date) doc.text(fmtDate(date), 196, 22.5, { align: 'right' });

  doc.setTextColor(...INK);
};

/** Two-column key/value block used for vendor and terms panels. */
const drawPanel = (doc, { x, y, w, heading, rows }) => {
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  const h = 8 + rows.length * 5.2;
  doc.roundedRect(x, y, w, h, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(heading.toUpperCase(), x + 3, y + 5);

  doc.setFontSize(8.5);
  rows.forEach(([label, value], i) => {
    const ly = y + 10.5 + i * 5.2;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(String(label), x + 3, ly);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INK);
    doc.text(String(value ?? '—'), x + w - 3, ly, { align: 'right' });
  });

  return y + h;
};

const drawFooter = (doc, note) => {
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(229, 231, 235);
    doc.line(14, 283, 196, 283);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(note, 14, 288);
    doc.text(`Page ${i} of ${pages}`, 196, 288, { align: 'right' });
    doc.text(`Generated ${fmtDate(new Date())}`, 105, 288, { align: 'center' });
  }
};

// ---------------------------------------------------------------------------
// Purchase Order
// ---------------------------------------------------------------------------
//
// Laid out after the reference document src/assets/PO Format.docx. The PO is
// printed onto the company's PHYSICAL letterhead, so it deliberately carries no
// digital header, logo or footer band, and the top of every page is left clear.

// Page geometry in mm. A4 is 210 x 297.
const PO_PAGE = {
  // The reference keeps Word's 25.4 mm top margin plus six blank 9 pt lines
  // (~23 mm) above its first line of text: about 50 mm clear for the
  // pre-printed letterhead. Every page reserves it, since each is printed on
  // letterhead. Raise this if your letterhead is taller.
  top: 50,
  // Content stops 20 mm above the page edge; the page number (multi-page
  // orders only) sits in that strip. Raise this if your letterhead has a footer.
  bottom: 297 - 20,
  left: 20,
  right: 190,
  width: 170,
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 18-Aug-2026, as the reference writes dates
const fmtPoDate = (d) => {
  if (!d) return '—';
  const x = new Date(d);
  return isNaN(x.getTime())
    ? '—'
    : `${String(x.getDate()).padStart(2, '0')}-${MONTHS[x.getMonth()]}-${x.getFullYear()}`;
};

// Plain Indian-grouped figures, as the reference prints them. Money always
// carries two decimals so a column of amounts reads consistently.
const amount = (n) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const quantity = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });

// "A", "A & B", "A, B & C" — for the Subject line
const joinNames = (names) =>
  (names.length <= 1 ? (names[0] || '') : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`);

const setType = (doc, { size = 10, style = 'normal' } = {}) => {
  doc.setFont('helvetica', style);
  doc.setFontSize(size);
  doc.setTextColor(0, 0, 0);
};

// jsPDF has no underline option, so draw the rule the reference uses by hand
const underline = (doc, text, x, y, align = 'left') => {
  const w = doc.getTextWidth(text);
  const start = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(start, y + 0.9, start + w, y + 0.9);
};

/**
 * Lay out a Purchase Order and return the jsPDF document, without saving it.
 * Split from the download so the layout can be rendered and checked outside a
 * browser.
 *
 * @param {Object} po a purchase order with its vendor populated
 * @param {{ jsPDF: Function, autoTable: Function }} libs
 */
export const buildPurchaseOrderPdf = (po, { jsPDF, autoTable }) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const vendor = po.vendor && typeof po.vendor === 'object' ? po.vendor : {};
  const lineHeight = (size) => size * 0.3528 * doc.getLineHeightFactor();
  // jsPDF positions text by its baseline, so the first line sits a cap-height
  // below the reserved area — otherwise the tops of the letters would rise
  // into the letterhead space.
  const firstBaseline = PO_PAGE.top + 4.5;
  let y = firstBaseline;

  // Start a fresh page — letterhead space reserved again — when the next block
  // would otherwise run into the bottom margin.
  const ensure = (space) => {
    if (y + space > PO_PAGE.bottom) {
      doc.addPage();
      y = firstBaseline;
    }
  };

  // Bordered black grid, as in the reference. Its page margins keep table rows
  // that spill onto a new page below the letterhead too.
  const grid = {
    theme: 'grid',
    styles: {
      font: 'helvetica', fontSize: 9.5, textColor: 0, lineColor: 0, lineWidth: 0.2,
      cellPadding: 1.8, valign: 'middle', overflow: 'linebreak', fillColor: [255, 255, 255],
    },
    margin: {
      top: PO_PAGE.top, bottom: 297 - PO_PAGE.bottom,
      left: PO_PAGE.left, right: 210 - PO_PAGE.right,
    },
    rowPageBreak: 'avoid',
  };

  // --- Reference number and date --------------------------------------------
  setType(doc, { size: 10.5, style: 'bold' });
  doc.text(`Purchase Order No. : ${po.poNumber || '—'}`, PO_PAGE.left, y);
  y += 5.5;
  doc.text(`Date : ${fmtPoDate(po.poDate)}`, PO_PAGE.right, y, { align: 'right' });
  // Traceability back to the approval that authorised this order
  if (po.rateComparisonNumber) {
    setType(doc, { size: 8.5 });
    doc.text(`Ref. Rate Comparison : ${po.rateComparisonNumber}`, PO_PAGE.left, y);
  }
  y += 10;

  // --- Title ----------------------------------------------------------------
  setType(doc, { size: 14, style: 'bold' });
  doc.text('PURCHASE ORDER', 105, y, { align: 'center' });
  underline(doc, 'PURCHASE ORDER', 105, y, 'center');
  y += 9;

  // --- Vendor contact -------------------------------------------------------
  setType(doc, { size: 10, style: 'bold' });
  doc.text(`Vendor Mobile No. : ${vendor.phone || '—'}`, PO_PAGE.left, y);
  y += 5;
  doc.text(`Vendor Email Id : ${po.vendorEmail || vendor.email || '—'}`, PO_PAGE.left, y);
  y += 3.5;

  // --- Vendor / Bill To / Ship To -------------------------------------------
  // A PO is addressed to the business; the legal (PAN) name follows it when
  // the two differ, so neither is lost.
  const legalName = po.vendorName || vendor.vendorName;
  const tradingName = vendor.companyName;
  const vendorNameCell = tradingName && legalName
    && tradingName.trim().toLowerCase() !== legalName.trim().toLowerCase()
    ? `${tradingName}\n(${legalName})`
    : (tradingName || legalName || '—');
  const vendorAddress = [
    vendor.address,
    vendor.city,
    [vendor.state, vendor.pincode].filter(Boolean).join(' - '),
  ].filter(Boolean).join(', ') || '—';

  autoTable(doc, {
    ...grid,
    styles: { ...grid.styles, fontSize: 9, cellPadding: 1.4 },
    startY: y,
    body: [
      ['Vendor Name', vendorNameCell, 'Bill To', COMPANY.displayName, 'Ship To', COMPANY.displayName],
      ['Vendor Address', vendorAddress, 'Branch Address', COMPANY.billing.address,
        'Shipping Address', po.deliveryLocation || '—'],
      ['Vendor GST No.', po.vendorGst || vendor.gstNumber || '—', 'Branch GST No.',
        COMPANY.billing.gstNumber, 'Branch GST No.', COMPANY.billing.gstNumber],
    ],
    columnStyles: {
      0: { cellWidth: 21, fontStyle: 'bold' },
      1: { cellWidth: 36 },
      2: { cellWidth: 20, fontStyle: 'bold' },
      3: { cellWidth: 37 },
      4: { cellWidth: 20, fontStyle: 'bold' },
      5: { cellWidth: 36 },
    },
  });
  y = doc.lastAutoTable.finalY + 7;

  // --- Salutation and subject -----------------------------------------------
  ensure(26);
  setType(doc, { size: 10.5, style: 'bold' });
  doc.text('Dear Sir,', PO_PAGE.left, y);
  y += 5;
  doc.text('We are pleased to award you the order of the following :', PO_PAGE.left, y);
  y += 7.5;

  const items = po.items || [];
  const itemNames = [...new Set(items.map((l) => String(l.itemName || '').trim()).filter(Boolean))];
  // The reference names the materials in the Subject. Listing every one on a
  // long order would push the item table off the first page, so the first
  // three are named and the rest counted.
  const SUBJECT_NAMES = 3;
  const named = itemNames.slice(0, SUBJECT_NAMES);
  const others = itemNames.length - named.length;
  const subjectItems = others > 0
    ? `${named.join(', ')} & ${others} other item${others === 1 ? '' : 's'}`
    : joinNames(named);
  const subjectLines = doc.splitTextToSize(
    `Subject :: Purchase Order of ${subjectItems || 'Materials'}:-`, PO_PAGE.width
  );
  ensure(subjectLines.length * lineHeight(10.5) + 4);
  subjectLines.forEach((ln, i) => {
    const ly = y + i * lineHeight(10.5);
    doc.text(ln, PO_PAGE.left, ly);
    underline(doc, ln, PO_PAGE.left, ly);
  });
  y += subjectLines.length * lineHeight(10.5) + 3;

  // --- Items ----------------------------------------------------------------
  // "Specification" is the per-item description, which only older purchase
  // orders carry. An always-empty column would look broken, so it appears only
  // when at least one line has one.
  const hasSpec = items.some((l) => String(l.description || '').trim());
  const head = hasSpec
    ? ['Item', 'Specification', 'Qty', 'Units', 'Rate (Rs.)', 'Total (Rs.)']
    : ['Item', 'Qty', 'Units', 'Rate (Rs.)', 'Total (Rs.)'];
  const widths = hasSpec ? [38, 40, 18, 18, 26, 30] : [78, 18, 18, 26, 30];
  const body = items.map((l) => [
    l.itemName || '—',
    ...(hasSpec ? [l.description || '—'] : []),
    quantity(l.quantity),
    l.unit || '—',
    amount(l.rate),
    amount(l.amount),
  ]);

  // Totals sit in the same grid, under the Total column
  const label = (content, bold = false) => ({
    content, colSpan: head.length - 1, styles: { halign: 'right', fontStyle: bold ? 'bold' : 'normal' },
  });
  const figure = (content, bold = false) => ({
    content, styles: { halign: 'center', fontStyle: bold ? 'bold' : 'normal' },
  });
  // "10", "2.5" — a percentage as written on the order
  const pct = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  // A discount shows its percentage and amount, then the taxable amount GST is
  // charged on. Orders saved before percentages hold a fixed amount. With no
  // discount the block is exactly as before.
  const discountRows = po.discount
    ? [
        [label(po.discountPercent != null ? `Discount @ ${pct(po.discountPercent)}%` : 'Discount'), figure(`- ${amount(po.discount)}`)],
        [label('Taxable Amount'), figure(amount(Math.max(0, (po.subTotal || 0) - po.discount)))],
      ]
    : [];
  const foot = [
    [label('Sub Total'), figure(amount(po.subTotal))],
    ...discountRows,
    [label(`GST @ ${pct(po.taxPercent)}%`), figure(amount(po.taxAmount))],
    [label('Grand Total', true), figure(amount(po.totalAmount), true)],
  ];

  autoTable(doc, {
    ...grid,
    startY: y,
    head: [head],
    body,
    foot,
    // A long order stays readable across pages, with totals only at the end
    showHead: 'everyPage',
    showFoot: 'lastPage',
    headStyles: {
      fontStyle: 'bold', halign: 'center', fillColor: [255, 255, 255],
      textColor: 0, lineColor: 0, lineWidth: 0.2,
    },
    footStyles: { fillColor: [255, 255, 255], textColor: 0, lineColor: 0, lineWidth: 0.2 },
    bodyStyles: { halign: 'center', cellPadding: 1.6 },
    columnStyles: Object.fromEntries(widths.map((w, i) => [i, { cellWidth: w }])),
  });
  y = doc.lastAutoTable.finalY + 8;

  // --- Payment terms & conditions -------------------------------------------
  ensure(lineHeight(11.5) + 12);
  setType(doc, { size: 11.5, style: 'bold' });
  doc.text('Payment Terms & Condition:-', PO_PAGE.left, y);
  y += 6;

  setType(doc, { size: 10.5, style: 'bold' });
  const paragraph = (text) => {
    const lines = doc.splitTextToSize(String(text), PO_PAGE.width);
    ensure(lines.length * lineHeight(10.5));
    doc.text(lines, PO_PAGE.left, y);
    y += lines.length * lineHeight(10.5) + 1.5;
  };
  if (po.paymentTerms) paragraph(po.paymentTerms);
  if (po.expectedDeliveryDate) paragraph(`Expected Delivery Date : ${fmtPoDate(po.expectedDeliveryDate)}`);
  y += 2;

  // Point-wise terms. Older purchase orders hold a single free-text block
  // instead, so that is split into lines and numbered the same way.
  const termPoints = (po.terms && po.terms.length)
    ? po.terms
    : (po.termsAndConditions || '')
        .split(/\r?\n/)
        .map((t) => t.replace(/^\s*\d+[.)]\s*/, '').trim())
        .filter(Boolean);

  setType(doc, { size: 10, style: 'bold' });
  termPoints.forEach((term, i) => {
    const lines = doc.splitTextToSize(String(term), PO_PAGE.width - 8);
    ensure(lines.length * lineHeight(10) + 1.5);
    doc.text(`${i + 1}.`, PO_PAGE.left + 1, y);
    doc.text(lines, PO_PAGE.left + 8, y);
    y += lines.length * lineHeight(10) + 1;
  });

  // --- Signatory ------------------------------------------------------------
  // Kept together on one page, with room between the two lines for a
  // signature and the company stamp.
  const SIGNATURE_GAP = 18;
  y += 5;
  ensure(SIGNATURE_GAP + 1);
  setType(doc, { size: 10, style: 'bold' });
  doc.text(`For ${COMPANY.legalName}`, PO_PAGE.right, y, { align: 'right' });
  doc.text('Authorized Signatory', PO_PAGE.right, y + SIGNATURE_GAP, { align: 'right' });

  // Page numbers only when the order runs past one page
  const pages = doc.internal.getNumberOfPages();
  if (pages > 1) {
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      setType(doc, { size: 8 });
      doc.text(`${po.poNumber || 'Purchase Order'}   Page ${i} of ${pages}`, 105, PO_PAGE.bottom + 7, { align: 'center' });
    }
  }

  return doc;
};

/**
 * Build and download a Purchase Order PDF, ready to print on letterhead.
 * @param {Object} po a populated purchase order
 */
export const exportPurchaseOrderPdf = async (po) => {
  const libs = await loadPdf();
  const doc = buildPurchaseOrderPdf(po, libs);
  doc.save(`${String(po.poNumber || 'PurchaseOrder').replace(/[\\/]/g, '-')}.pdf`);
};

// ---------------------------------------------------------------------------
// Rate Comparison
// ---------------------------------------------------------------------------

// Content stops here so nothing runs into the footer rule at 283 mm
const RC_PAGE_BOTTOM = 276;

/**
 * Lay out a Rate Comparison and return the jsPDF document, without saving it.
 * Handles one item (the original single-material layout) and several items
 * quoted by several vendors.
 *
 * @param {Object} rc a populated rate comparison
 * @param {{ jsPDF: Function, autoTable: Function }} libs
 */
export const buildRateComparisonPdf = (rc, { jsPDF, autoTable }) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const { items, quotations: quotes } = comparisonView(rc);
  const multi = items.length > 1;

  drawHeader(doc, {
    title: 'RATE COMPARISON',
    reference: rc.comparisonNumber,
    date: rc.comparisonDate,
    accent: BRAND,
  });

  let y = 34;
  const ensure = (height) => {
    if (y + height > RC_PAGE_BOTTOM) {
      doc.addPage();
      y = 20;
    }
  };

  const leftEnd = drawPanel(doc, {
    x: 14, y, w: 88, heading: 'Requirement',
    rows: multi
      ? [
          ['Items', `${items.length} items`],
          ['Vendors', String(quotes.length)],
          ['Date', fmtDate(rc.comparisonDate)],
          ['Prepared By', rc.createdByName || rc.createdBy?.name],
        ]
      : [
          ['Material', items[0]?.itemName || rc.materialName],
          ['Quantity', `${items[0]?.requiredQuantity ?? '—'} ${items[0]?.unit || ''}`.trim()],
          ['Date', fmtDate(rc.comparisonDate)],
          ['Prepared By', rc.createdByName || rc.createdBy?.name],
        ],
  });

  const statusLabel = {
    draft: 'Draft', pending_approval: 'Pending Approval', approved: 'Approved',
    rejected: 'Rejected', sent_back: 'Sent Back', cancelled: 'Cancelled',
  }[rc.status] || rc.status;

  const rightEnd = drawPanel(doc, {
    x: 108, y, w: 88, heading: 'Status',
    rows: [
      ['Status', statusLabel],
      ['Submitted By', rc.submittedByName || '—'],
      ['Submitted On', fmtDate(rc.submittedAt)],
      ['Recommended', rc.selectedVendorName || 'Not selected'],
      ['Purchase Order', rc.poNumber || '—'],
    ],
  });

  y = Math.max(leftEnd, rightEnd) + 6;

  // No longer collected; still printed for comparisons created before the change
  if (rc.materialDescription) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    const lines = doc.splitTextToSize(`Specification: ${rc.materialDescription}`, 182);
    doc.text(lines, 14, y);
    y += lines.length * 4 + 3;
    doc.setTextColor(...INK);
  }

  const table = {
    theme: 'grid',
    headStyles: { fillColor: BRAND, textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8.5, textColor: INK, valign: 'middle' },
    margin: { left: 14, right: 14, top: 20, bottom: 297 - RC_PAGE_BOTTOM },
    rowPageBreak: 'avoid',
  };

  const sectionTitle = (label) => {
    ensure(16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text(label, 14, y);
    doc.setTextColor(...INK);
    y += 2;
  };

  // Vendors whose totals are comparable: those that quoted every item
  const quotedAll = (q) => items.every((it) => lineFor(q, it._id));
  const priced = quotes.filter((q) => (q.totalAmount || 0) > 0);
  const complete = priced.filter(quotedAll);
  const pool = complete.length ? complete : priced;
  const lowest = pool.length ? Math.min(...pool.map((q) => q.totalAmount)) : null;
  const selected = quotes.find((q) => q.isSelected);

  if (!multi) {
    // One item: the original vendor-by-vendor table
    const item = items[0];
    autoTable(doc, {
      ...table,
      startY: y,
      head: [['#', 'Vendor', 'Rate', 'GST', 'Tax Amt', 'Delivery Time', 'Total', '']],
      body: quotes.map((q, i) => {
        const line = item ? lineFor(q, item._id) : null;
        return [
          i + 1,
          q.vendorName || '—',
          line ? money(line.quotedRate) : '—',
          line ? `${line.taxPercent || 0}%` : '—',
          money(q.taxAmount),
          (line && line.deliveryTime) || '—',
          money(q.totalAmount),
          [q.isSelected ? 'Selected' : '', lowest != null && q.totalAmount === lowest ? 'Lowest' : '']
            .filter(Boolean).join(' / '),
        ];
      }),
      columnStyles: {
        0: { cellWidth: 9, halign: 'center' },
        2: { cellWidth: 24, halign: 'right' },
        3: { cellWidth: 14, halign: 'center' },
        4: { cellWidth: 24, halign: 'right' },
        5: { cellWidth: 26, halign: 'center' },
        6: { cellWidth: 27, halign: 'right', fontStyle: 'bold' },
        7: { cellWidth: 22, halign: 'center', fontSize: 7.5 },
      },
      // Tint the recommended row so the Director's eye lands on it first
      didParseCell: (data) => {
        if (data.section === 'body' && quotes[data.row.index]?.isSelected) {
          data.cell.styles.fillColor = [254, 243, 199];
        }
      },
    });
    y = doc.lastAutoTable.finalY + 6;
  } else {
    // --- Items ------------------------------------------------------------
    sectionTitle('ITEMS');
    autoTable(doc, {
      ...table,
      startY: y,
      head: [['#', 'Item', 'Required Qty', 'Unit']],
      body: items.map((it, i) => [i + 1, it.itemName || '—', String(it.requiredQuantity ?? '—'), it.unit || '—']),
      columnStyles: {
        0: { cellWidth: 9, halign: 'center' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 26, halign: 'center' },
      },
    });
    y = doc.lastAutoTable.finalY + 7;

    // --- Vendor totals ------------------------------------------------------
    sectionTitle('VENDOR SUMMARY');
    autoTable(doc, {
      ...table,
      startY: y,
      head: [['#', 'Vendor', 'Items Quoted', 'Base Amount', 'Tax Amt', 'Total', '']],
      body: quotes.map((q, i) => {
        const count = items.filter((it) => lineFor(q, it._id)).length;
        return [
          i + 1,
          q.vendorName || '—',
          `${count} of ${items.length}`,
          money(q.baseAmount),
          money(q.taxAmount),
          money(q.totalAmount),
          [
            q.isSelected ? 'Selected' : '',
            lowest != null && pool.includes(q) && q.totalAmount === lowest ? 'Lowest' : '',
            count < items.length ? 'Incomplete' : '',
          ].filter(Boolean).join(' / '),
        ];
      }),
      columnStyles: {
        0: { cellWidth: 9, halign: 'center' },
        2: { cellWidth: 22, halign: 'center' },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' },
        5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: 27, halign: 'center', fontSize: 7.5 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && quotes[data.row.index]?.isSelected) {
          data.cell.styles.fillColor = [254, 243, 199];
        }
      },
    });
    y = doc.lastAutoTable.finalY + 7;

    // --- Item by item, every vendor side by side ---------------------------
    sectionTitle('ITEM-WISE COMPARISON');
    const rowMeta = [];
    const body = [];
    items.forEach((it) => {
      const offers = quotes.map((q) => lineFor(q, it._id)).filter(Boolean);
      const itemLowest = offers.length > 1 ? Math.min(...offers.map((l) => l.totalAmount)) : null;
      quotes.forEach((q, vi) => {
        const line = lineFor(q, it._id);
        const row = [];
        if (vi === 0) {
          row.push({
            content: `${it.itemName || '—'}\n${it.requiredQuantity ?? '—'} ${it.unit || ''}`.trim(),
            rowSpan: quotes.length,
            styles: { fontStyle: 'bold', valign: 'middle', fillColor: [255, 255, 255] },
          });
        }
        row.push(
          q.vendorName || '—',
          line ? money(line.quotedRate) : '—',
          line ? `${line.taxPercent || 0}%` : '—',
          line ? money(line.totalAmount) : '—',
          (line && line.deliveryTime) || '—',
          (line && line.paymentTerms) || '—',
          line
            ? [q.isSelected ? 'Selected' : '', itemLowest != null && line.totalAmount === itemLowest ? 'Lowest' : ''].filter(Boolean).join(' / ')
            : 'Not quoted',
        );
        body.push(row);
        rowMeta.push({ selected: !!q.isSelected });
      });
    });

    autoTable(doc, {
      ...table,
      startY: y,
      head: [['Item', 'Vendor', 'Rate', 'GST', 'Total', 'Delivery Time', 'Payment Terms', '']],
      body,
      headStyles: { ...table.headStyles, fontSize: 8 },
      bodyStyles: { ...table.bodyStyles, fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 32 },
        1: { cellWidth: 30 },
        2: { cellWidth: 20, halign: 'right' },
        3: { cellWidth: 12, halign: 'center' },
        4: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
        5: { cellWidth: 22 },
        7: { cellWidth: 17, halign: 'center', fontSize: 7 },
      },
      didParseCell: (data) => {
        if (data.section !== 'body' || data.column.index === 0) return;
        if (rowMeta[data.row.index]?.selected) data.cell.styles.fillColor = [254, 243, 199];
      },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // Analysis the Director would otherwise have to do by eye
  if (selected && lowest != null) {
    const missing = items.filter((it) => !lineFor(selected, it._id)).map((it) => it.itemName);
    const premium = +(selected.totalAmount - lowest).toFixed(2);
    const isLowest = !missing.length && premium <= 0;
    const scope = multi ? ' for all items' : '';
    const message = missing.length
      ? `Recommended vendor ${selected.vendorName} has not quoted: ${missing.join(', ')}.`
      : isLowest
        ? `Recommended vendor ${selected.vendorName} is also the lowest quote${scope} at ${money(selected.totalAmount)}.`
        : `Recommended vendor ${selected.vendorName} at ${money(selected.totalAmount)} is ${money(premium)} above the lowest quote${scope}.`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const lines = doc.splitTextToSize(message, 176);
    const h = 6 + lines.length * 4;
    ensure(h + 5);
    doc.setFillColor(...(isLowest ? [236, 253, 245] : [254, 249, 195]));
    doc.setDrawColor(...(isLowest ? [167, 243, 208] : [253, 224, 71]));
    doc.roundedRect(14, y, 182, h, 1.5, 1.5, 'FD');
    doc.setTextColor(...INK);
    doc.text(lines, 17, y + 6.8);
    y += h + 5;
  }

  if (rc.comparisonRemarks) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const lines = doc.splitTextToSize(rc.comparisonRemarks, 182);
    ensure(5 + lines.length * 4 + 4);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...MUTED);
    doc.text("PURCHASE TEAM'S REASONING", 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...INK);
    doc.text(lines, 14, y + 5);
    y += 5 + lines.length * 4 + 4;
  }

  if (rc.directorReview?.decision) {
    doc.setFontSize(8.5);
    const remarkLines = rc.directorReview.remarks ? doc.splitTextToSize(rc.directorReview.remarks, 182) : [];
    ensure(14 + remarkLines.length * 4);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...MUTED);
    doc.text('DIRECTOR DECISION', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(
      `${statusLabel} by ${rc.directorReview.reviewedByName || '—'} on ${fmtDate(rc.directorReview.reviewedAt)}`,
      14, y + 5
    );
    if (remarkLines.length) {
      doc.setFontSize(8.5);
      doc.text(remarkLines, 14, y + 10);
      y += remarkLines.length * 4;
    }
    y += 14;
  }

  // Approval block, for a printed sign-off
  let signY = Math.max(y + 8, 250);
  if (signY + 6 > RC_PAGE_BOTTOM) {
    doc.addPage();
    signY = 40;
  }
  doc.setDrawColor(156, 163, 175);
  doc.line(14, signY, 74, signY);
  doc.line(136, signY, 196, signY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('Prepared By (Purchase)', 14, signY + 4.5);
  doc.text('Approved By (Director)', 136, signY + 4.5);

  drawFooter(doc, 'This is a computer-generated rate comparison.');
  return doc;
};

/**
 * Build and download a Rate Comparison PDF, formatted for the Director's review.
 * @param {Object} rc a populated rate comparison
 */
export const exportRateComparisonPdf = async (rc) => {
  const libs = await loadPdf();
  const doc = buildRateComparisonPdf(rc, libs);
  doc.save(`${String(rc.comparisonNumber || 'RateComparison').replace(/[\\/]/g, '-')}.pdf`);
};
