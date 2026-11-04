import PDFDocument from 'pdfkit';
import { pool, query } from '../../config/database.js';
import { AppError } from '../../shared/errors.js';
import * as audit from '../audit/audit.service.js';
import { decimal } from '../costing/costing.calculator.js';

async function findQuotation(id) {
  const result = await query(`SELECT q.*,cr.status AS review_status,cr.costing_revision_id,
    crv.rfq_part_id,p.rfq_id FROM quotations q
    JOIN commercial_reviews cr ON cr.id=q.commercial_review_id
    JOIN costing_revisions crv ON crv.id=cr.costing_revision_id
    JOIN rfq_parts p ON p.id=crv.rfq_part_id WHERE q.id=$1`, [id]);
  return result.rows[0];
}

function render(snapshot) {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ margin: 50 });
    const chunks = [];
    document.on('data', chunk => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);
    document.fontSize(20).text(snapshot.company.name);
    document.fontSize(10).text(snapshot.company.address);
    document.moveDown().fontSize(18).text('Quotation');
    document.fontSize(10).text(`Quotation number: ${snapshot.quotationNumber}`);
    document.text(`RFQ number: ${snapshot.rfqNumber}`);
    document.text(`Customer: ${snapshot.customerName}`);
    document.text(`Part: ${snapshot.partName}`);
    document.text(`Material: ${snapshot.material}`);
    document.moveDown().fontSize(12).text('Approved commercial summary');
    const components = snapshot.calculations.components;
    document.fontSize(10).text(`Quantity: 1`);
    document.text(`Unit selling price: ${decimal.formatCurrency(components.sellingPrice)}`);
    document.text(`Annual volume: ${snapshot.annualVolume}`);
    document.moveDown().fontSize(12).text('Cost and commercial summary');
    for (const [label, value] of Object.entries(components)) {
      document.fontSize(10).text(`${label}: ${decimal.formatCurrency(value)}`);
    }
    const taxableValue = decimal.parse(components.sellingPrice);
    const tax = decimal.percent(taxableValue, snapshot.company.taxRate);
    const total = taxableValue + tax;
    document.moveDown().fontSize(12).text('Tax summary');
    document.fontSize(10).text(`Taxable value: ${decimal.formatCurrency(taxableValue)}`);
    document.text(`GST (${snapshot.company.taxRate}%): ${decimal.formatCurrency(tax)}`);
    document.text(`Total including GST: ${decimal.formatCurrency(total)}`);
    document.text(`Validity: ${snapshot.company.validityDays} days`);
    document.moveDown().text('This quotation is generated from the approved persisted costing revision.');
    document.end();
  });
}

export async function download(id, user) {
  const quotation = await findQuotation(id);
  if (!quotation) throw new AppError(404, 'Quotation not found');
  if (quotation.review_status !== 'approved') throw new AppError(409, 'Only approved quotations can be downloaded');
  if (!quotation.snapshot?.company) throw new AppError(422, 'Quotation snapshot is incomplete');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let document = await client.query('SELECT * FROM quotation_documents WHERE quotation_id=$1', [id]);
    if (!document.rows[0]) {
      const content = await render(quotation.snapshot);
      document = await client.query(`INSERT INTO quotation_documents (quotation_id,content) VALUES ($1,$2) RETURNING *`, [id, content]);
      await client.query(`UPDATE quotations SET status='issued',issued_at=now(),issued_by=$2 WHERE id=$1`, [id, user.id]);
      await client.query(`UPDATE rfqs SET status='quoted',updated_at=now() WHERE id=$1`, [quotation.rfq_id]);
      await audit.record(client, { actorId: user.id, entityType: 'quotation', entityId: id, action: 'pdf_generated', metadata: { quotationNumber: quotation.quotation_number } });
      await audit.record(client, { actorId: user.id, entityType: 'quotation', entityId: id, action: 'issued', metadata: { quotationNumber: quotation.quotation_number, costingRevisionId: quotation.costing_revision_id } });
    } else if (quotation.status !== 'issued') {
      await client.query(`UPDATE quotations SET status='issued',issued_at=COALESCE(issued_at,now()),issued_by=COALESCE(issued_by,$2) WHERE id=$1`, [id, user.id]);
      await client.query(`UPDATE rfqs SET status='quoted',updated_at=now() WHERE id=$1`, [quotation.rfq_id]);
      await audit.record(client, { actorId: user.id, entityType: 'quotation', entityId: id, action: 'issued', metadata: { quotationNumber: quotation.quotation_number, costingRevisionId: quotation.costing_revision_id } });
    }
    await client.query('COMMIT');
    const updated = await findQuotation(id);
    return { quotation: updated, document: document.rows[0] };
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

export async function issue(id, user) {
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
      await client.query(`INSERT INTO quotation_documents (quotation_id,content) VALUES ($1,$2)`, [id, content]);
      await audit.record(client, { actorId: user.id, entityType: 'quotation', entityId: id, action: 'pdf_generated', metadata: { quotationNumber: quotation.quotation_number } });
    }
    await client.query(`UPDATE quotations SET status='issued',issued_at=COALESCE(issued_at,now()),issued_by=COALESCE(issued_by,$2) WHERE id=$1`, [id, user.id]);
    await client.query(`UPDATE rfqs SET status='quoted',updated_at=now() WHERE id=$1`, [quotation.rfq_id]);
    await audit.record(client, { actorId: user.id, entityType: 'quotation', entityId: id, action: 'issued', metadata: { quotationNumber: quotation.quotation_number, costingRevisionId: quotation.costing_revision_id } });
    await client.query('COMMIT');
    return findQuotation(id);
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}
