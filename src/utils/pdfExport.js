/**
 * PDF generation for Purchase Orders and Rate Comparisons.
 *
 * jsPDF is imported on demand — the same pattern the Excel export already uses —
 * so it stays out of the initial bundle and only downloads when someone actually
 * exports something.
 */

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
const PURCHASE = [4, 120, 87];    // emerald-700
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

/**
 * Build and download a Purchase Order PDF, formatted for sending to a vendor.
 * @param {Object} po a populated purchase order
 */
export const exportPurchaseOrderPdf = async (po) => {
  const { jsPDF, autoTable } = await loadPdf();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  drawHeader(doc, {
    title: 'PURCHASE ORDER',
    reference: po.poNumber,
    date: po.poDate,
    accent: PURCHASE,
  });

  const vendor = po.vendor || {};
  let y = 34;

  const leftEnd = drawPanel(doc, {
    x: 14, y, w: 88, heading: 'Vendor',
    rows: [
      ['Name', po.vendorName || vendor.vendorName],
      ['Company', vendor.companyName],
      ['Email', po.vendorEmail || vendor.email],
      ['Phone', vendor.phone],
      ['GST', po.vendorGst || vendor.gstNumber],
    ],
  });

  const rightEnd = drawPanel(doc, {
    x: 108, y, w: 88, heading: 'Order Details',
    rows: [
      ['PO Date', fmtDate(po.poDate)],
      ['Expected Delivery', fmtDate(po.expectedDeliveryDate)],
      ['Deliver To', po.deliveryLocation],
      ['Payment Terms', po.paymentTerms],
      ['Raised By', po.createdByName || po.createdBy?.name],
    ],
  });

  y = Math.max(leftEnd, rightEnd) + 6;

  // Traceability back to the approval that authorised this order
  if (po.rateComparisonNumber) {
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(14, y, 182, 9, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(6, 95, 70);
    doc.text(
      `Raised against approved rate comparison ${po.rateComparisonNumber}`,
      17, y + 5.8
    );
    doc.setTextColor(...INK);
    y += 14;
  }

  autoTable(doc, {
    startY: y,
    head: [['#', 'Item / Description', 'Qty', 'Unit', 'Rate', 'Amount']],
    body: (po.items || []).map((l, i) => [
      i + 1,
      // Older purchase orders may still carry a per-item description
      l.description ? `${l.itemName}\n${l.description}` : l.itemName,
      l.quantity,
      l.unit || '—',
      money(l.rate),
      money(l.amount),
    ]),
    theme: 'grid',
    headStyles: { fillColor: PURCHASE, textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8.5, textColor: INK },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 18, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 32, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  // Totals
  y = doc.lastAutoTable.finalY + 5;
  const totals = [
    ['Subtotal', money(po.subTotal)],
    ...(po.discount ? [['Discount', `- ${money(po.discount)}`]] : []),
    [`Tax / GST (${po.taxPercent || 0}%)`, money(po.taxAmount)],
  ];
  totals.forEach(([label, value], i) => {
    const ty = y + i * 5.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(label, 140, ty);
    doc.setTextColor(...INK);
    doc.text(value, 196, ty, { align: 'right' });
  });

  y += totals.length * 5.5 + 1;
  doc.setFillColor(...PURCHASE);
  doc.roundedRect(126, y, 70, 10, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL', 130, y + 6.5);
  doc.text(money(po.totalAmount), 192, y + 6.5, { align: 'right' });
  doc.setTextColor(...INK);

  y += 18;

  // Point-wise terms. Older purchase orders hold a single free-text block
  // instead, so that is split into lines and numbered the same way.
  const termPoints = (po.terms && po.terms.length)
    ? po.terms
    : (po.termsAndConditions || '')
        .split(/\r?\n/)
        .map((t) => t.replace(/^\s*\d+[.)]\s*/, '').trim())
        .filter(Boolean);

  if (termPoints.length) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text('TERMS & CONDITIONS', 14, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);

    termPoints.forEach((term, i) => {
      const label = `${i + 1}.`;
      const lines = doc.splitTextToSize(String(term), 176);
      // Start a new page rather than running off the bottom
      if (y + lines.length * 4 > 268) {
        doc.addPage();
        y = 20;
      }
      doc.text(label, 14, y);
      doc.text(lines, 20, y);
      y += lines.length * 4 + 1.5;
    });
  }

  // Signature block
  y = Math.max(y + 12, 250);
  doc.setDrawColor(156, 163, 175);
  doc.line(14, y, 74, y);
  doc.line(136, y, 196, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('For OmTrax', 14, y + 4.5);
  doc.text('Vendor Acknowledgement', 136, y + 4.5);

  drawFooter(doc, 'This is a computer-generated purchase order.');
  doc.save(`${String(po.poNumber || 'PurchaseOrder').replace(/[\\/]/g, '-')}.pdf`);
};

// ---------------------------------------------------------------------------
// Rate Comparison
// ---------------------------------------------------------------------------

/**
 * Build and download a Rate Comparison PDF, formatted for the Director's review.
 * @param {Object} rc a populated rate comparison
 */
export const exportRateComparisonPdf = async (rc) => {
  const { jsPDF, autoTable } = await loadPdf();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  drawHeader(doc, {
    title: 'RATE COMPARISON',
    reference: rc.comparisonNumber,
    date: rc.comparisonDate,
    accent: BRAND,
  });

  let y = 34;

  const leftEnd = drawPanel(doc, {
    x: 14, y, w: 88, heading: 'Requirement',
    rows: [
      ['Material', rc.materialName],
      ['Quantity', `${rc.requiredQuantity ?? '—'} ${rc.unit || ''}`.trim()],
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

  const quotes = rc.quotations || [];
  const lowest = quotes.length ? Math.min(...quotes.map((q) => q.totalAmount ?? Infinity)) : null;

  autoTable(doc, {
    startY: y,
    head: [['#', 'Vendor', 'Rate', 'GST', 'Tax Amt', 'Delivery Time', 'Total', '']],
    body: quotes.map((q, i) => [
      i + 1,
      q.vendorName || '—',
      money(q.quotedRate),
      `${q.taxPercent || 0}%`,
      money(q.taxAmount),
      q.deliveryTime || '—',
      money(q.totalAmount),
      [q.isSelected ? 'Selected' : '', q.totalAmount === lowest ? 'Lowest' : '']
        .filter(Boolean).join(' / '),
    ]),
    theme: 'grid',
    headStyles: { fillColor: BRAND, textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8.5, textColor: INK },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      2: { cellWidth: 24, halign: 'right' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 26, halign: 'center' },
      6: { cellWidth: 27, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 22, halign: 'center', fontSize: 7.5 },
    },
    margin: { left: 14, right: 14 },
    // Tint the recommended row so the Director's eye lands on it first
    didParseCell: (data) => {
      if (data.section === 'body' && quotes[data.row.index]?.isSelected) {
        data.cell.styles.fillColor = [254, 243, 199];
      }
    },
  });

  y = doc.lastAutoTable.finalY + 6;

  // Analysis the Director would otherwise have to do by eye
  const selected = quotes.find((q) => q.isSelected);
  if (selected && lowest != null) {
    const premium = +(selected.totalAmount - lowest).toFixed(2);
    const isLowest = premium <= 0;
    doc.setFillColor(...(isLowest ? [236, 253, 245] : [254, 249, 195]));
    doc.setDrawColor(...(isLowest ? [167, 243, 208] : [253, 224, 71]));
    doc.roundedRect(14, y, 182, 11, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...INK);
    doc.text(
      isLowest
        ? `Recommended vendor ${selected.vendorName} is also the lowest quote at ${money(selected.totalAmount)}.`
        : `Recommended vendor ${selected.vendorName} at ${money(selected.totalAmount)} is ${money(premium)} above the lowest quote.`,
      17, y + 6.8
    );
    y += 16;
  }

  if (rc.comparisonRemarks) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text("PURCHASE TEAM'S REASONING", 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(rc.comparisonRemarks, 182);
    doc.text(lines, 14, y + 5);
    y += 5 + lines.length * 4 + 4;
  }

  if (rc.directorReview?.decision) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    doc.text('DIRECTOR DECISION', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    doc.text(
      `${statusLabel} by ${rc.directorReview.reviewedByName || '—'} on ${fmtDate(rc.directorReview.reviewedAt)}`,
      14, y + 5
    );
    if (rc.directorReview.remarks) {
      doc.setFontSize(8.5);
      const lines = doc.splitTextToSize(rc.directorReview.remarks, 182);
      doc.text(lines, 14, y + 10);
      y += lines.length * 4;
    }
    y += 14;
  }

  // Approval block, for a printed sign-off
  y = Math.max(y + 8, 250);
  doc.setDrawColor(156, 163, 175);
  doc.line(14, y, 74, y);
  doc.line(136, y, 196, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('Prepared By (Purchase)', 14, y + 4.5);
  doc.text('Approved By (Director)', 136, y + 4.5);

  drawFooter(doc, 'This is a computer-generated rate comparison.');
  doc.save(`${String(rc.comparisonNumber || 'RateComparison').replace(/[\\/]/g, '-')}.pdf`);
};
