import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Customer, Vendor, ComputedCustomerLedgerRow, ComputedLedgerRow } from '../types';

/**
 * Cleanly format currency for PDF reports (without redundant symbols in tight table cells)
 */
function formatNumberForPDF(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount) || amount === 0) return '-';
  return Math.round(amount).toLocaleString('en-PK');
}

function formatBalanceForPDF(balance: number, isCustomer: boolean = true): string {
  const rounded = Math.round(Math.abs(balance)).toLocaleString('en-PK');
  if (balance === 0) return 'PKR 0 (Settled)';
  if (isCustomer) {
    return balance > 0 ? `PKR ${rounded} (Receivable / Dr)` : `PKR ${rounded} (Advance / Cr)`;
  } else {
    return balance > 0 ? `PKR ${rounded} (Payable / Cr)` : `PKR ${rounded} (Advance / Dr)`;
  }
}

/**
 * Generate & download a high-resolution, professional PDF statement for a Customer
 */
export function downloadCustomerLedgerPDF(
  customer: Customer,
  ledgerRows: ComputedCustomerLedgerRow[],
  currentBalance: number,
  periodTitle: string = 'All Recorded History'
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  // 1. Top Decorative Brand Accent Bar
  doc.setFillColor(220, 38, 38); // Brand Red #dc2626
  doc.rect(0, 0, pageWidth, 4, 'F');

  // 2. Company Header
  let currentY = 12;

  // Brand Logo Badge
  doc.setFillColor(220, 38, 38);
  doc.roundedRect(margin, currentY, 10, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('KFH', margin + 5, currentY + 6.8, { align: 'center' });

  // Company Name & Subtitle
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('KHAN FILTER HOUSE', margin + 13, currentY + 4.5);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('Automotive, Heavy Machinery & Industrial Filtration Specialists', margin + 13, currentY + 8.5);
  doc.text('Auto Market, Faisalabad & Lahore • Accounts Dept: 0300-5551234', margin + 13, currentY + 12);

  // Right Side: Report Title & Period Box
  const reportBoxWidth = 72;
  const reportBoxX = pageWidth - margin - reportBoxWidth;
  
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(reportBoxX, currentY - 2, reportBoxWidth, 16, 2, 2, 'FD');

  doc.setTextColor(220, 38, 38);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('CUSTOMER ACCOUNT STATEMENT', reportBoxX + reportBoxWidth / 2, currentY + 2.5, { align: 'center' });

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const nowStr = new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  doc.text(`Period: ${periodTitle}`, reportBoxX + reportBoxWidth / 2, currentY + 7, { align: 'center' });
  doc.text(`Generated: ${nowStr}`, reportBoxX + reportBoxWidth / 2, currentY + 11, { align: 'center' });

  currentY += 18;

  // Horizontal Divider
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 4;

  // 3. Customer Info Box & Financial Summary Cards (Two Columns)
  const colWidth = (contentWidth - 4) / 2;
  const cardHeight = 28;

  // Left Card: Customer Information
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, colWidth, cardHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('CUSTOMER ACCOUNT DETAILS', margin + 3, currentY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42); // slate-900
  const custName = customer.name.length > 34 ? customer.name.substring(0, 32) + '...' : customer.name;
  doc.text(custName, margin + 3, currentY + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  const typeLabel = customer.type === 'company' ? 'Corporate / B2B Company' : 'Individual / Retail Client';
  doc.text(`Type: ${typeLabel}`, margin + 3, currentY + 14);

  const phoneStr = customer.phone ? `Phone: ${customer.phone}` : 'Phone: N/A';
  const cityStr = customer.city ? `City: ${customer.city}` : '';
  doc.text(`${phoneStr}${cityStr ? ' • ' + cityStr : ''}`, margin + 3, currentY + 18);

  const addressStr = customer.address ? `Address: ${customer.address.substring(0, 42)}` : (customer.ntn ? `NTN/STRN: ${customer.ntn}` : '');
  if (addressStr) {
    doc.text(addressStr, margin + 3, currentY + 22);
  }

  // Right Card: Financial Position & Net Balance Summary
  doc.setFillColor(currentBalance > 0 ? 255 : (currentBalance < 0 ? 240 : 248), currentBalance > 0 ? 241 : (currentBalance < 0 ? 253 : 250), currentBalance > 0 ? 242 : (currentBalance < 0 ? 244 : 252));
  doc.setDrawColor(currentBalance > 0 ? 254 : (currentBalance < 0 ? 187 : 226), currentBalance > 0 ? 205 : (currentBalance < 0 ? 247 : 232), currentBalance > 0 ? 211 : (currentBalance < 0 ? 208 : 240));
  doc.roundedRect(margin + colWidth + 4, currentY, colWidth, cardHeight, 2, 2, 'FD');

  const rightCardX = margin + colWidth + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(currentBalance > 0 ? 159 : (currentBalance < 0 ? 22 : 100), currentBalance > 0 ? 18 : (currentBalance < 0 ? 101 : 116), currentBalance > 0 ? 57 : (currentBalance < 0 ? 52 : 139));
  doc.text('STATEMENT FINANCIAL SUMMARY', rightCardX + 3, currentY + 4.5);

  const totalDebit = ledgerRows.reduce((sum, r) => sum + (r.debit || 0), 0);
  const totalCredit = ledgerRows.reduce((sum, r) => sum + (r.credit || 0), 0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Total Debited (Sales / B/F): PKR ${Math.round(totalDebit).toLocaleString('en-PK')}`, rightCardX + 3, currentY + 9.5);
  doc.text(`Total Credited (Paid / Recv): PKR ${Math.round(totalCredit).toLocaleString('en-PK')}`, rightCardX + 3, currentY + 14);

  // Net Balance Highlight
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(currentBalance > 0 ? 190 : (currentBalance < 0 ? 5 : 15), currentBalance > 0 ? 18 : (currentBalance < 0 ? 150 : 23), currentBalance > 0 ? 60 : (currentBalance < 0 ? 105 : 42));
  doc.text(`NET OUTSTANDING BALANCE:`, rightCardX + 3, currentY + 19.5);

  doc.setFontSize(10);
  const balanceText = formatBalanceForPDF(currentBalance, true);
  doc.text(balanceText, rightCardX + 3, currentY + 24.5);

  currentY += cardHeight + 4;

  // 4. Ledger Transaction Table
  const tableData = ledgerRows.map((row, idx) => {
    const formattedDate = row.date 
      ? new Date(row.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
      : '-';

    const code = row.entryCode || row.billNumber || (row.sourceType === 'sale' ? 'Sale Invoice' : 'Receipt');
    const desc = row.description || (row.paymentMethod ? `Payment via ${row.paymentMethod}` : '-');

    const debitVal = row.debit && row.debit > 0 ? Math.round(row.debit).toLocaleString('en-PK') : '-';
    const creditVal = row.credit && row.credit > 0 ? Math.round(row.credit).toLocaleString('en-PK') : '-';
    
    let balStr = Math.round(Math.abs(row.runningBalance)).toLocaleString('en-PK');
    if (row.runningBalance > 0) {
      balStr += ' Dr';
    } else if (row.runningBalance < 0) {
      balStr += ' Cr';
    } else {
      balStr = '0.00';
    }

    return [
      String(idx + 1),
      formattedDate,
      code,
      desc,
      debitVal,
      creditVal,
      balStr
    ];
  });

  // Table Summary Footer Row
  let finalBalStr = Math.round(Math.abs(currentBalance)).toLocaleString('en-PK');
  if (currentBalance > 0) finalBalStr += ' Dr';
  else if (currentBalance < 0) finalBalStr += ' Cr';
  else finalBalStr = '0.00';

  const tableFoot = [[
    '',
    '',
    'TOTALS',
    `Statement Summary (${ledgerRows.length} entries)`,
    Math.round(totalDebit).toLocaleString('en-PK'),
    Math.round(totalCredit).toLocaleString('en-PK'),
    finalBalStr
  ]];

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Date', 'Type / Code', 'Description / Particulars', 'Debit (+PKR)', 'Credit (-PKR)', 'Balance (PKR)']],
    body: tableData,
    foot: tableFoot,
    theme: 'striped',
    margin: { left: margin, right: margin, bottom: 20 },
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 1.8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    footStyles: {
      fillColor: [241, 245, 249], // slate-100
      textColor: [15, 23, 42],
      fontSize: 7.5,
      fontStyle: 'bold',
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 'auto', halign: 'left' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 28, halign: 'right' },
    },
    didDrawPage: (data) => {
      // Header for secondary pages
      if (data.pageNumber > 1) {
        doc.setFillColor(220, 38, 38);
        doc.rect(0, 0, pageWidth, 3, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`KHAN FILTER HOUSE • Customer Statement: ${customer.name}`, margin, 7);
        doc.text(`Page ${data.pageNumber}`, pageWidth - margin, 7, { align: 'right' });
        doc.line(margin, 9, pageWidth - margin, 9);
      }

      // Footer on every page
      const footerY = pageHeight - 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('This is a computer-generated transaction statement from Khan Filter House ERP. Please report discrepancies within 7 days.', margin, footerY);
      doc.text(`Page ${data.pageNumber}`, pageWidth - margin, footerY, { align: 'right' });
    }
  });

  // Check if we can fit the signature block on current page or if it needs drawing
  const finalY = (doc as any).lastAutoTable?.finalY || currentY + 30;
  let signY = finalY + 8;

  if (signY + 22 > pageHeight - 12) {
    doc.addPage();
    signY = 20;
  }

  // Verification & Signatures section
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);

  // Sign Box 1: Prepared By
  const signWidth = 48;
  doc.line(margin + 5, signY + 12, margin + 5 + signWidth, signY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Prepared By (Accounts Officer)', margin + 5 + signWidth / 2, signY + 15, { align: 'center' });

  // Sign Box 2: Verified By
  const midSignX = margin + (contentWidth - signWidth) / 2;
  doc.line(midSignX, signY + 12, midSignX + signWidth, signY + 12);
  doc.text('Verified By / Manager', midSignX + signWidth / 2, signY + 15, { align: 'center' });

  // Sign Box 3: Customer Signature & Stamp
  const rightSignX = pageWidth - margin - signWidth - 5;
  doc.line(rightSignX, signY + 12, rightSignX + signWidth, signY + 12);
  doc.text('Customer Signature & Stamp', rightSignX + signWidth / 2, signY + 15, { align: 'center' });

  // Clean filename with customer name and timestamp
  const safeName = customer.name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const dateStamp = new Date().toISOString().slice(0, 10);
  const fileName = `Customer_Statement_${safeName}_${dateStamp}.pdf`;

  doc.save(fileName);
}

/**
 * Generate & download a high-resolution, professional PDF statement for a Vendor
 */
export function downloadVendorLedgerPDF(
  vendor: Vendor,
  ledgerRows: ComputedLedgerRow[],
  currentBalance: number,
  periodTitle: string = 'All Recorded History'
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  // 1. Top Decorative Brand Accent Bar (Amber / Gold theme for Vendor accounts)
  doc.setFillColor(217, 119, 6); // Amber-600 #d97706
  doc.rect(0, 0, pageWidth, 4, 'F');

  // 2. Company Header
  let currentY = 12;

  // Brand Logo Badge
  doc.setFillColor(217, 119, 6);
  doc.roundedRect(margin, currentY, 10, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('KFH', margin + 5, currentY + 6.8, { align: 'center' });

  // Company Name & Subtitle
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('KHAN FILTER HOUSE', margin + 13, currentY + 4.5);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('Automotive, Heavy Machinery & Industrial Filtration Specialists', margin + 13, currentY + 8.5);
  doc.text('Auto Market, Faisalabad & Lahore • Procurement & Accounts: 0300-5551234', margin + 13, currentY + 12);

  // Right Side: Report Title & Period Box
  const reportBoxWidth = 72;
  const reportBoxX = pageWidth - margin - reportBoxWidth;
  
  doc.setFillColor(254, 252, 232); // amber-50
  doc.setDrawColor(251, 191, 36); // amber-400
  doc.roundedRect(reportBoxX, currentY - 2, reportBoxWidth, 16, 2, 2, 'FD');

  doc.setTextColor(180, 83, 9); // amber-700
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('VENDOR PAYABLES STATEMENT', reportBoxX + reportBoxWidth / 2, currentY + 2.5, { align: 'center' });

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const nowStr = new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  doc.text(`Period: ${periodTitle}`, reportBoxX + reportBoxWidth / 2, currentY + 7, { align: 'center' });
  doc.text(`Generated: ${nowStr}`, reportBoxX + reportBoxWidth / 2, currentY + 11, { align: 'center' });

  currentY += 18;

  // Horizontal Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 4;

  // 3. Vendor Info Box & Financial Summary Cards (Two Columns)
  const colWidth = (contentWidth - 4) / 2;
  const cardHeight = 28;

  // Left Card: Vendor Information
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, colWidth, cardHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('VENDOR / SUPPLIER DETAILS', margin + 3, currentY + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  const vName = vendor.businessName.length > 34 ? vendor.businessName.substring(0, 32) + '...' : vendor.businessName;
  doc.text(vName, margin + 3, currentY + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  const contactStr = vendor.contactPerson ? `Contact: ${vendor.contactPerson}` : 'Supplier Account';
  doc.text(contactStr, margin + 3, currentY + 14);

  const phoneStr = vendor.phone ? `Phone: ${vendor.phone}` : 'Phone: N/A';
  const cityStr = vendor.city ? `City: ${vendor.city}` : '';
  doc.text(`${phoneStr}${cityStr ? ' • ' + cityStr : ''}`, margin + 3, currentY + 18);

  const addressStr = vendor.address ? `Address: ${vendor.address.substring(0, 42)}` : `Linked Products: ${vendor.linkedProductIds?.length || 0} items`;
  doc.text(addressStr, margin + 3, currentY + 22);

  // Right Card: Financial Position & Balance We Owe Summary
  doc.setFillColor(currentBalance > 0 ? 254 : (currentBalance < 0 ? 240 : 248), currentBalance > 0 ? 243 : (currentBalance < 0 ? 253 : 250), currentBalance > 0 ? 199 : (currentBalance < 0 ? 244 : 252));
  doc.setDrawColor(currentBalance > 0 ? 245 : (currentBalance < 0 ? 187 : 226), currentBalance > 0 ? 158 : (currentBalance < 0 ? 247 : 232), currentBalance > 0 ? 11 : (currentBalance < 0 ? 208 : 240));
  doc.roundedRect(margin + colWidth + 4, currentY, colWidth, cardHeight, 2, 2, 'FD');

  const rightCardX = margin + colWidth + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(currentBalance > 0 ? 180 : (currentBalance < 0 ? 22 : 100), currentBalance > 0 ? 83 : (currentBalance < 0 ? 101 : 116), currentBalance > 0 ? 9 : (currentBalance < 0 ? 52 : 139));
  doc.text('STATEMENT FINANCIAL POSITION', rightCardX + 3, currentY + 4.5);

  const totalDebit = ledgerRows.reduce((sum, r) => sum + (r.debit || 0), 0);
  const totalCredit = ledgerRows.reduce((sum, r) => sum + (r.credit || 0), 0);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Total Purchases (Credit / Billed): PKR ${Math.round(totalCredit).toLocaleString('en-PK')}`, rightCardX + 3, currentY + 9.5);
  doc.text(`Total Paid / Sent (Debit / Cash): PKR ${Math.round(totalDebit).toLocaleString('en-PK')}`, rightCardX + 3, currentY + 14);

  // Net Balance Highlight
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(currentBalance > 0 ? 180 : (currentBalance < 0 ? 5 : 15), currentBalance > 0 ? 83 : (currentBalance < 0 ? 150 : 23), currentBalance > 0 ? 9 : (currentBalance < 0 ? 105 : 42));
  doc.text(`NET OUTSTANDING BALANCE:`, rightCardX + 3, currentY + 19.5);

  doc.setFontSize(10);
  const balanceText = formatBalanceForPDF(currentBalance, false);
  doc.text(balanceText, rightCardX + 3, currentY + 24.5);

  currentY += cardHeight + 4;

  // 4. Ledger Transaction Table
  const tableData = ledgerRows.map((row, idx) => {
    const formattedDate = row.date 
      ? new Date(row.date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
      : '-';

    const code = row.entryCode || row.billNumber || (row.sourceType === 'purchase' ? 'Purchase Bill' : 'Cash');
    const desc = row.description || '-';

    const debitVal = row.debit && row.debit > 0 ? Math.round(row.debit).toLocaleString('en-PK') : '-';
    const creditVal = row.credit && row.credit > 0 ? Math.round(row.credit).toLocaleString('en-PK') : ((row.sourceType === 'purchase' && ((row.credit === 0 && row.debit === 0) || row.description?.includes('Pending'))) ? '0 (Pending)' : '-');
    
    let balStr = Math.round(Math.abs(row.runningBalance)).toLocaleString('en-PK');
    if (row.runningBalance > 0) {
      balStr += ' Payable';
    } else if (row.runningBalance < 0) {
      balStr += ' Adv (Dr)';
    } else {
      balStr = '0.00';
    }

    return [
      String(idx + 1),
      formattedDate,
      code,
      desc,
      debitVal,
      creditVal,
      balStr
    ];
  });

  // Table Summary Footer Row
  let finalBalStr = Math.round(Math.abs(currentBalance)).toLocaleString('en-PK');
  if (currentBalance > 0) finalBalStr += ' Payable';
  else if (currentBalance < 0) finalBalStr += ' Adv (Dr)';
  else finalBalStr = '0.00';

  const tableFoot = [[
    '',
    '',
    'TOTALS',
    `Statement Summary (${ledgerRows.length} transactions)`,
    Math.round(totalDebit).toLocaleString('en-PK'),
    Math.round(totalCredit).toLocaleString('en-PK'),
    finalBalStr
  ]];

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Date', 'Type / Code', 'Description / Particulars', 'Debit (-Paid/Sent)', 'Credit (+Purchases)', 'Balance (PKR)']],
    body: tableData,
    foot: tableFoot,
    theme: 'striped',
    margin: { left: margin, right: margin, bottom: 20 },
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 1.8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontSize: 7.5,
      fontStyle: 'bold',
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 'auto', halign: 'left' },
      4: { cellWidth: 24, halign: 'right' },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 28, halign: 'right' },
    },
    didDrawPage: (data) => {
      // Header for secondary pages
      if (data.pageNumber > 1) {
        doc.setFillColor(217, 119, 6);
        doc.rect(0, 0, pageWidth, 3, 'F');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`KHAN FILTER HOUSE • Vendor Statement: ${vendor.businessName}`, margin, 7);
        doc.text(`Page ${data.pageNumber}`, pageWidth - margin, 7, { align: 'right' });
        doc.line(margin, 9, pageWidth - margin, 9);
      }

      // Footer on every page
      const footerY = pageHeight - 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text('This is a computer-generated vendor statement from Khan Filter House ERP. Please report discrepancies within 7 days.', margin, footerY);
      doc.text(`Page ${data.pageNumber}`, pageWidth - margin, footerY, { align: 'right' });
    }
  });

  // Signature Block
  const finalY = (doc as any).lastAutoTable?.finalY || currentY + 30;
  let signY = finalY + 8;

  if (signY + 22 > pageHeight - 12) {
    doc.addPage();
    signY = 20;
  }

  // Verification & Signatures section
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);

  // Sign Box 1: Prepared By
  const signWidth = 48;
  doc.line(margin + 5, signY + 12, margin + 5 + signWidth, signY + 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Prepared By (Accounts Officer)', margin + 5 + signWidth / 2, signY + 15, { align: 'center' });

  // Sign Box 2: Verified By
  const midSignX = margin + (contentWidth - signWidth) / 2;
  doc.line(midSignX, signY + 12, midSignX + signWidth, signY + 12);
  doc.text('Verified By / Finance Manager', midSignX + signWidth / 2, signY + 15, { align: 'center' });

  // Sign Box 3: Vendor Signature & Stamp
  const rightSignX = pageWidth - margin - signWidth - 5;
  doc.line(rightSignX, signY + 12, rightSignX + signWidth, signY + 12);
  doc.text('Vendor Signature & Official Stamp', rightSignX + signWidth / 2, signY + 15, { align: 'center' });

  // Clean filename with vendor business name and timestamp
  const safeName = vendor.businessName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const dateStamp = new Date().toISOString().slice(0, 10);
  const fileName = `Vendor_Statement_${safeName}_${dateStamp}.pdf`;

  doc.save(fileName);
}
