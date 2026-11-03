import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pool, query } from '../../config/database.js';
import { AppError } from '../../shared/errors.js';

const storageRoot = path.resolve(process.env.PRIVATE_DOCUMENTS_DIR || path.resolve(process.cwd(), 'private-documents'));
const allowedTypes = new Map([
  ['application/pdf', 'drawing_pdf'],
  ['application/vnd.ms-excel', 'part_list'],
  ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'part_list']
]);

async function assertAccess(rfqId, user, write = false) {
  const result = await query('SELECT id,owner_id FROM rfqs WHERE id=$1', [rfqId]);
  const rfq = result.rows[0];
  if (!rfq) throw new AppError(404, 'RFQ not found');
  if (write && (user.role !== 'estimator' || rfq.owner_id !== user.id)) throw new AppError(403, 'Only the assigned estimator can upload RFQ documents');
  if (!write && user.role === 'estimator' && rfq.owner_id !== user.id) throw new AppError(403, 'You do not have permission to access these documents');
  return rfq;
}

function documentType(file) {
  const type = allowedTypes.get(file.mimetype);
  if (!type) throw new AppError(415, 'Only PDF drawings and Excel part lists are supported');
  const isPdf = file.buffer.subarray(0, 5).toString() === '%PDF-';
  const isZip = file.buffer.subarray(0, 2).toString() === 'PK';
  const isLegacyExcel = file.buffer.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0]));
  if ((type === 'drawing_pdf' && !isPdf) || (type === 'part_list' && !isZip && !isLegacyExcel)) {
    throw new AppError(415, 'The file content does not match its declared document type');
  }
  return type;
}

export async function list(rfqId, user) {
  await assertAccess(rfqId, user);
  const result = await query(`SELECT id,document_type,original_filename,mime_type,size_bytes,version,
    replaced_document_id,uploaded_by,created_at FROM rfq_documents WHERE rfq_id=$1 ORDER BY created_at DESC`, [rfqId]);
  return result.rows;
}

export async function upload(rfqId, files, user) {
  await assertAccess(rfqId, user, true);
  if (!files?.length) throw new AppError(400, 'At least one document is required');
  await fs.mkdir(storageRoot, { recursive: true });
  const client = await pool.connect();
  const written = [];
  try {
    await client.query('BEGIN');
    const saved = [];
    for (const file of files) {
      const type = documentType(file);
      const previous = await client.query(`SELECT id,version FROM rfq_documents
        WHERE rfq_id=$1 AND document_type=$2 ORDER BY version DESC LIMIT 1`, [rfqId, type]);
      const version = (previous.rows[0]?.version || 0) + 1;
      const storagePath = `${rfqId}/${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`;
      const absolutePath = path.join(storageRoot, storagePath);
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, file.buffer, { flag: 'wx' });
      written.push(absolutePath);
      const result = await client.query(`INSERT INTO rfq_documents
        (rfq_id,document_type,original_filename,storage_path,mime_type,size_bytes,version,replaced_document_id,uploaded_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id,document_type,original_filename,mime_type,size_bytes,version,created_at`,
        [rfqId, type, file.originalname, storagePath, file.mimetype, file.size, version, previous.rows[0]?.id || null, user.id]);
      saved.push(result.rows[0]);
    }
    await client.query('COMMIT');
    return saved;
  } catch (error) {
    await client.query('ROLLBACK');
    await Promise.all(written.map(file => fs.rm(file, { force: true })));
    throw error;
  } finally {
    client.release();
  }
}

export async function download(id, user) {
  const result = await query(`SELECT d.*,r.owner_id FROM rfq_documents d JOIN rfqs r ON r.id=d.rfq_id WHERE d.id=$1`, [id]);
  const document = result.rows[0];
  if (!document) throw new AppError(404, 'Document not found');
  if (user.role === 'estimator' && document.owner_id !== user.id) throw new AppError(403, 'You do not have permission to access this document');
  try {
    return { document, content: await fs.readFile(path.join(storageRoot, document.storage_path)) };
  } catch (error) {
    if (error.code === 'ENOENT') throw new AppError(410, 'Document content is no longer available');
    throw error;
  }
}

export { documentType };
