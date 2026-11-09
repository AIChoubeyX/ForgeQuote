import PDFDocument from 'pdfkit';
import { pool, query } from '../../config/database.js';
import { AppError } from '../../shared/errors.js';
import * as audit from '../audit/audit.service.js';
import { decimal } from '../costing/costing.calculator.js';

async function findQuotation(id) {
  const result = await query(
    `SELECT q.*, cr.status AS review_status, cr.costing_revision_id,
            crv.rfq_part_id, p.rfq_id, r.owner_id
     FROM quotations q
     JOIN commercial_reviews cr ON cr.id = q.commercial_review_id
     JOIN costing_revisions crv ON crv.id = cr.costing_revision_id
     JOIN rfq_parts p ON p.id = crv.rfq_part_id
     JOIN rfqs r ON r.id = p.rfq_id
     WHERE q.id = $1`,
    [id]
  );
  return result.rows[0];
}

function formatCurrencyINR(val) {
  const num = Number(val);
  if (!Number.isFinite(num)) return 'INR 0.00';
  return `INR ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function sanitizeText(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

function render(snapshot) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 36,
        size: 'A4',
        bufferPages: true,
        info: {
          Title: `Quotation ${snapshot.quotationNumber || 'FQ'}`,
          Author: snapshot.company?.name || 'ForgeQuote Manufacturing',
          Subject: `Commercial Quotation for ${snapshot.customerName || 'Customer'}`
        }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const PAGE_WIDTH = doc.page.width; // 595.28
      const MARGIN = 36;
      const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2; // 523.28

      // Palette
      const NAVY = '#10243E';
      const ORANGE = '#FF5A1F';
      const CHARCOAL = '#292D34';
      const MUTED = '#555E6D';
      const BORDER_LIGHT = '#E2E8F0';
      const BG_LIGHT = '#F8FAFC';

      // 1. BRANDING & HEADER BLOCK
      let y = MARGIN;

      // FQ Logo Badge
      doc.roundedRect(MARGIN, y, 28, 28, 5).fill(ORANGE);
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#FFFFFF').text('FQ', MARGIN, y + 7, {
        width: 28,
        align: 'center'
      });

      // Brand Title
      doc.fontSize(16).font('Helvetica-Bold').fillColor(NAVY).text('ForgeQuote', MARGIN + 35, y);
      doc.fontSize(6.5).font('Helvetica').fillColor(MUTED).text(
        'PRECISION MANUFACTURING & COMMERCIAL QUOTATIONS',
        MARGIN + 35,
        y + 18
      );

      // Company Info (Left under logo)
      const compName = sanitizeText(snapshot.company?.name || 'ForgeQuote Systems Pvt. Ltd.');
      const compAddr = sanitizeText(snapshot.company?.address || 'Industrial Manufacturing Hub, Special Economic Zone');
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(CHARCOAL).text(compName, MARGIN, y + 33);
      doc.fontSize(7).font('Helvetica').fillColor(MUTED).text(compAddr, MARGIN, y + 43, { width: 220 });

      // Document Title & Meta Box (Right-aligned)
      doc.fontSize(13).font('Helvetica-Bold').fillColor(NAVY).text('COMMERCIAL QUOTATION', 300, y, {
        width: CONTENT_WIDTH - 264,
        align: 'right'
      });
      doc.fontSize(10.5).font('Helvetica-Bold').fillColor(ORANGE).text(
        snapshot.quotationNumber || 'FQ-2026-DRAFT',
        300,
        y + 16,
        { width: CONTENT_WIDTH - 264, align: 'right' }
      );

      const quoteDate = snapshot.approvedAt
        ? new Date(snapshot.approvedAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })
        : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

      doc.fontSize(7.5).font('Helvetica').fillColor(MUTED);
      doc.text(`Issue Date: ${quoteDate}`, 300, y + 30, { width: CONTENT_WIDTH - 264, align: 'right' });
      doc.text(`RFQ Reference: ${snapshot.rfqNumber || '—'}`, 300, y + 40, { width: CONTENT_WIDTH - 264, align: 'right' });
      doc.text(`Validity: ${snapshot.company?.validityDays || 30} Days  ·  Rev v${snapshot.costingRevision || 1}`, 300, y + 50, {
        width: CONTENT_WIDTH - 264,
        align: 'right'
      });

      // Accent Divider
      y = 104;
      doc.rect(MARGIN, y, CONTENT_WIDTH, 2).fill(ORANGE);
      doc.rect(MARGIN, y + 3, CONTENT_WIDTH, 0.5).fill(NAVY);

      // 2. CUSTOMER & COMPONENT CARDS (Two Columns)
      y = 114;
      const cardWidth = (CONTENT_WIDTH - 12) / 2;
      const cardHeight = 74;

      // Card 1: Client Information
      doc.roundedRect(MARGIN, y, cardWidth, cardHeight, 3).fillAndStroke(BG_LIGHT, BORDER_LIGHT);
      doc.roundedRect(MARGIN, y, cardWidth, 16, 3).fill(NAVY);
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#FFFFFF').text(
        'CLIENT SPECIFICATIONS',
        MARGIN + 8,
        y + 4.5
      );

      const custName = sanitizeText(snapshot.customerName || 'Direct Industrial Customer');
      doc.fontSize(9).font('Helvetica-Bold').fillColor(CHARCOAL).text(custName, MARGIN + 8, y + 22, {
        width: cardWidth - 16,
        ellipsis: true
      });
      doc.fontSize(7).font('Helvetica').fillColor(MUTED).text(
        'Account Status: Authorized Commercial Partner',
        MARGIN + 8,
        y + 35
      );
      doc.fontSize(7).font('Helvetica').fillColor(MUTED).text(
        `RFQ Identifier: ${snapshot.rfqNumber || '—'}`,
        MARGIN + 8,
        y + 46
      );
      doc.fontSize(7).font('Helvetica').fillColor(MUTED).text(
        'Quality Standard: ISO 9001 / IATF 16949 Compliant',
        MARGIN + 8,
        y + 57
      );

      // Card 2: Part Details
      const card2X = MARGIN + cardWidth + 12;
      doc.roundedRect(card2X, y, cardWidth, cardHeight, 3).fillAndStroke(BG_LIGHT, BORDER_LIGHT);
      doc.roundedRect(card2X, y, cardWidth, 16, 3).fill(NAVY);
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#FFFFFF').text(
        'ENGINEERING COMPONENT DETAILS',
        card2X + 8,
        y + 4.5
      );

      const partName = sanitizeText(snapshot.partName || 'Engineered Component');
      doc.fontSize(9).font('Helvetica-Bold').fillColor(CHARCOAL).text(partName, card2X + 8, y + 22, {
        width: cardWidth - 16,
        ellipsis: true
      });
      doc.fontSize(7).font('Helvetica').fillColor(MUTED).text(
        `Material Specification: ${sanitizeText(snapshot.material || 'Standard Engineering Steel')}`,
        card2X + 8,
        y + 35
      );
      doc.fontSize(7).font('Helvetica').fillColor(MUTED).text(
        `Target Annual Volume: ${Number(snapshot.annualVolume || 1).toLocaleString('en-IN')} units / year`,
        card2X + 8,
        y + 46
      );

      const descSnippet = sanitizeText(
        snapshot.description || 'Precision manufacturing component per technical engineering release.'
      );
      doc.fontSize(6.5).font('Helvetica-Oblique').fillColor(MUTED).text(
        descSnippet,
        card2X + 8,
        y + 57,
        { width: cardWidth - 16, height: 12, ellipsis: true }
      );

      // 3. ITEMIZED COMMERCIAL COST BREAKDOWN TABLE
      y = 196;
      doc.fontSize(9.5).font('Helvetica-Bold').fillColor(NAVY).text('COMMERCIAL PRICING SCHEDULE', MARGIN, y);
      doc.fontSize(7).font('Helvetica').fillColor(MUTED).text(
        'Approved Unit Manufacturing & Commercial Assessment (Per Unit)',
        MARGIN,
        y + 12
      );

      y = 216;
      // Table Header Row
      const col1X = MARGIN;
      const col1W = 280;
      const col2X = col1X + col1W;
      const col2W = 105;
      const col3X = col2X + col2W;
      const col3W = CONTENT_WIDTH - (col1W + col2W);

      doc.rect(col1X, y, CONTENT_WIDTH, 18).fill(NAVY);
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#FFFFFF');
      doc.text('COST ELEMENT & SPECIFICATION', col1X + 8, y + 5.5);
      doc.text('CATEGORY BASIS', col2X, y + 5.5, { width: col2W - 8, align: 'right' });
      doc.text('UNIT AMOUNT', col3X, y + 5.5, { width: col3W - 8, align: 'right' });

      y += 18;

      const components = snapshot.calculations?.components || {};
      const rows = [
        {
          label: 'Direct Raw Material & Alloy Stock',
          sub: `Specification: ${sanitizeText(snapshot.material || 'Standard Grade')}`,
          basis: 'Material rate schedule',
          amount: components.material || '0'
        },
        {
          label: 'Precision Machining, Tooling & Labor',
          sub: 'Operational cycle time & labor absorption',
          basis: 'Machine master rates',
          amount: components.manufacturing || components.processing || '0'
        },
        {
          label: 'Factory Indirect Overheads',
          sub: 'Plant operations, supervision & utilities',
          basis: 'Standard allocation',
          amount: components.overhead || '0'
        },
        {
          label: 'Protective Packaging & Transit Crating',
          sub: 'Corrosion prevention & transit packing',
          basis: 'Fixed packaging schedule',
          amount: components.packing || '0'
        },
        {
          label: 'Logistics, Freight & Dispatch Handling',
          sub: 'Factory dispatch & material movement',
          basis: 'Freight rate schedule',
          amount: components.freight || '0'
        }
      ];

      // Scrap credit if present
      const scrapVal = Number(components.scrap || 0);
      if (scrapVal > 0) {
        rows.push({
          label: 'Less: Scrap Metal Recovery Credit',
          sub: 'Recycled turning / forging chip credit',
          basis: 'Standard recovery factor',
          amount: `-${components.scrap}`
        });
      }

      // Render Table Data Rows
      rows.forEach((row, idx) => {
        const rowBg = idx % 2 === 0 ? '#FFFFFF' : BG_LIGHT;
        doc.rect(col1X, y, CONTENT_WIDTH, 19).fillAndStroke(rowBg, BORDER_LIGHT);

        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(CHARCOAL).text(row.label, col1X + 8, y + 2.5, {
          width: col1W - 12,
          ellipsis: true
        });
        doc.fontSize(6).font('Helvetica').fillColor(MUTED).text(row.sub, col1X + 8, y + 10.5, {
          width: col1W - 12,
          ellipsis: true
        });

        doc.fontSize(7).font('Helvetica').fillColor(MUTED).text(row.basis, col2X, y + 5.5, {
          width: col2W - 8,
          align: 'right'
        });

        const isCredit = String(row.amount).startsWith('-');
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(isCredit ? '#15803D' : CHARCOAL).text(
          formatCurrencyINR(Math.abs(Number(row.amount))),
          col3X,
          y + 5.5,
          { width: col3W - 8, align: 'right' }
        );

        y += 19;
      });

      // Commercial Calculations & Summary Box
      const rawSelling = Number(components.sellingPrice || components.totalCost || 0);
      const taxRate = Number(snapshot.company?.taxRate || 18);
      const taxAmount = (rawSelling * taxRate) / 100;
      const totalAmount = rawSelling + taxAmount;

      y += 6;

      // Summary lines (Subtotal & GST)
      doc.rect(col1X, y, CONTENT_WIDTH, 42).fillAndStroke(BG_LIGHT, BORDER_LIGHT);

      doc.fontSize(7.5).font('Helvetica').fillColor(MUTED).text(
        'Net Commercial Base Value (Per Piece):',
        col1X + 12,
        y + 5
      );
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(CHARCOAL).text(
        formatCurrencyINR(rawSelling),
        col3X,
        y + 5,
        { width: col3W - 8, align: 'right' }
      );

      doc.fontSize(7.5).font('Helvetica').fillColor(MUTED).text(
        `Applicable Goods & Services Tax (GST ${taxRate}%):`,
        col1X + 12,
        y + 16
      );
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(CHARCOAL).text(
        formatCurrencyINR(taxAmount),
        col3X,
        y + 16,
        { width: col3W - 8, align: 'right' }
      );

      // Final Total Highlight Box
      doc.rect(col1X, y + 27, CONTENT_WIDTH, 23).fill(NAVY);
      doc.rect(col1X, y + 27, 3.5, 23).fill(ORANGE);

      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#FFFFFF').text(
        'FINAL UNIT SELLING PRICE (INCL. GST):',
        col1X + 12,
        y + 34
      );
      doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#FFFFFF').text(
        formatCurrencyINR(totalAmount),
        col3X,
        y + 33,
        { width: col3W - 8, align: 'right' }
      );

      y += 56;

      // 4. COMMERCIAL TERMS & CONDITIONS
      y += 6;
      doc.fontSize(8).font('Helvetica-Bold').fillColor(NAVY).text(
        'COMMERCIAL TERMS & REGULATORY GOVERNANCE',
        MARGIN,
        y
      );
      y += 11;

      const validityDays = snapshot.company?.validityDays || 30;
      const terms = [
        `1. Price Validity: This commercial quotation is firm and valid for ${validityDays} calendar days from date of issuance.`,
        '2. Manufacturing Quality: Components manufactured under strict adherence to ISO 9001 / IATF 16949 certified quality systems.',
        '3. Payment Terms: Net 30 days from commercial invoice date following quality inspection and receipt.',
        '4. Delivery Terms: Ex-Works manufacturing facility dispatch unless otherwise specified in mutual purchase order agreements.',
        '5. Confidentiality: This document contains proprietary commercial costing and is issued strictly to the named recipient entity.'
      ];

      doc.fontSize(6.5).font('Helvetica').fillColor(MUTED);
      terms.forEach(t => {
        doc.text(t, MARGIN, y, { width: CONTENT_WIDTH });
        y += 9.5;
      });

      // 5. AUTHORITATIVE SIGN-OFF BLOCK
      y += 6;
      const signBoxY = y;
      doc.roundedRect(MARGIN, signBoxY, CONTENT_WIDTH, 42, 3).fillAndStroke(BG_LIGHT, BORDER_LIGHT);

      doc.fontSize(7).font('Helvetica-Bold').fillColor(CHARCOAL).text(
        'Authoritative System Certification',
        MARGIN + 10,
        signBoxY + 8
      );
      doc.fontSize(6.5).font('Helvetica').fillColor(MUTED).text(
        'This quotation is generated from approved and persisted costing revisions in ForgeQuote.',
        MARGIN + 10,
        signBoxY + 18,
        { width: 270 }
      );
      doc.fontSize(6).font('Helvetica').fillColor(MUTED).text(
        `Approved Revision ID: ${snapshot.costingRevisionId || 'CR-AUTHORITATIVE'}`,
        MARGIN + 10,
        signBoxY + 28
      );

      // Signature line right
      const sigX = 350;
      doc.strokeColor(CHARCOAL).lineWidth(0.6).moveTo(sigX, signBoxY + 26).lineTo(sigX + 130, signBoxY + 26).stroke();
      doc.fontSize(7).font('Helvetica-Bold').fillColor(NAVY).text(
        'Commercial Sales Directorate',
        sigX,
        signBoxY + 30,
        { width: 130, align: 'center' }
      );

      // 6. RUNNING FOOTER WITH DYNAMIC PAGE NUMBERS
      // Note: Setting doc.page.margins.bottom = 0 during footer rendering and using lineBreak: false
      // ensures PDFKit never generates false auto page-breaks past the bottom margin!
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        const oldBottom = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;
        const footerY = doc.page.height - 22;

        // Thin divider
        doc.rect(MARGIN, footerY - 4, CONTENT_WIDTH, 0.5).fill(BORDER_LIGHT);

        // Footer text
        doc.fontSize(6).font('Helvetica').fillColor(MUTED).text(
          'CONFIDENTIAL  ·  FORGEQUOTE COMMERCIAL OPERATIONS SYSTEM',
          MARGIN,
          footerY,
          { lineBreak: false }
        );

        doc.fontSize(6).font('Helvetica').fillColor(MUTED).text(
          `Page ${i + 1} of ${range.count}`,
          MARGIN,
          footerY,
          { width: CONTENT_WIDTH, align: 'right', lineBreak: false }
        );

        doc.page.margins.bottom = oldBottom;
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function download(id, user) {
  const quotation = await findQuotation(id);
  if (!quotation) throw new AppError(404, 'Quotation not found');
  if (user.role === 'estimator' && quotation.owner_id !== user.id) {
    throw new AppError(403, 'You do not have permission to access this quotation');
  }
  if (quotation.review_status !== 'approved') throw new AppError(409, 'Only approved quotations can be downloaded');
  if (!quotation.snapshot?.company) throw new AppError(422, 'Quotation snapshot is incomplete');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let document = await client.query('SELECT * FROM quotation_documents WHERE quotation_id=$1', [id]);
    if (!document.rows[0]) {
      const content = await render(quotation.snapshot);
      document = await client.query(
        `INSERT INTO quotation_documents (quotation_id, content) VALUES ($1, $2) RETURNING *`,
        [id, content]
      );
      await client.query(
        `UPDATE quotations SET status='issued', issued_at=COALESCE(issued_at, now()), issued_by=COALESCE(issued_by, $2) WHERE id=$1`,
        [id, user.id]
      );
      await client.query(`UPDATE rfqs SET status='quoted', updated_at=now() WHERE id=$1`, [quotation.rfq_id]);
      await audit.record(client, {
        actorId: user.id,
        entityType: 'quotation',
        entityId: id,
        action: 'pdf_generated',
        metadata: { quotationNumber: quotation.quotation_number }
      });
      await audit.record(client, {
        actorId: user.id,
        entityType: 'quotation',
        entityId: id,
        action: 'issued',
        metadata: { quotationNumber: quotation.quotation_number, costingRevisionId: quotation.costing_revision_id }
      });
    } else if (quotation.status !== 'issued') {
      await client.query(
        `UPDATE quotations SET status='issued', issued_at=COALESCE(issued_at, now()), issued_by=COALESCE(issued_by, $2) WHERE id=$1`,
        [id, user.id]
      );
      await client.query(`UPDATE rfqs SET status='quoted', updated_at=now() WHERE id=$1`, [quotation.rfq_id]);
      await audit.record(client, {
        actorId: user.id,
        entityType: 'quotation',
        entityId: id,
        action: 'issued',
        metadata: { quotationNumber: quotation.quotation_number, costingRevisionId: quotation.costing_revision_id }
      });
    }
    await client.query('COMMIT');
    const updated = await findQuotation(id);
    return { quotation: updated, document: document.rows[0] };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function issue(id, user) {
  if (user?.role === 'estimator') {
    throw new AppError(403, 'Estimators are not authorized to issue commercial quotations');
  }
  const quotation = await findQuotation(id);
  if (!quotation) throw new AppError(404, 'Quotation not found');
  if (quotation.review_status !== 'approved') throw new AppError(409, 'Only approved quotations can be issued');
  if (!quotation.snapshot?.company) throw new AppError(422, 'Quotation snapshot is incomplete');

  if (quotation.status === 'issued') {
    return quotation;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let document = await client.query('SELECT * FROM quotation_documents WHERE quotation_id=$1', [id]);
    if (!document.rows[0]) {
      const content = await render(quotation.snapshot);
      await client.query(`INSERT INTO quotation_documents (quotation_id, content) VALUES ($1, $2)`, [id, content]);
      await audit.record(client, {
        actorId: user.id,
        entityType: 'quotation',
        entityId: id,
        action: 'pdf_generated',
        metadata: { quotationNumber: quotation.quotation_number }
      });
    }
    await client.query(
      `UPDATE quotations SET status='issued', issued_at=COALESCE(issued_at, now()), issued_by=COALESCE(issued_by, $2) WHERE id=$1`,
      [id, user.id]
    );
    await client.query(`UPDATE rfqs SET status='quoted', updated_at=now() WHERE id=$1`, [quotation.rfq_id]);
    await audit.record(client, {
      actorId: user.id,
      entityType: 'quotation',
      entityId: id,
      action: 'issued',
      metadata: { quotationNumber: quotation.quotation_number, costingRevisionId: quotation.costing_revision_id }
    });
    await client.query('COMMIT');
    return findQuotation(id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export { render };
