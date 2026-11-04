import crypto from 'node:crypto';
import { AppError } from '../../shared/errors.js';

const MAX_TEXT_LENGTH = 50000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function sanitizeAndBoundText(text) {
  // Strip null bytes and non-printable control characters except tabs, line breaks
  const sanitized = String(text || '')
    .replace(/\u0000/g, '')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
    .trim();

  if (!sanitized) {
    throw new AppError(
      422,
      'The document contains no readable text. Scanned or image-only PDFs require OCR before extraction.'
    );
  }

  // Detect likely scanned or image-only PDF (text is trivially short despite a document being uploaded)
  if (sanitized.length < 20) {
    throw new AppError(
      422,
      'Insufficient text detected in document. Scanned or image-only PDFs require OCR before extraction.'
    );
  }

  if (sanitized.length > MAX_TEXT_LENGTH) {
    throw new AppError(413, `Document text exceeds the ${MAX_TEXT_LENGTH.toLocaleString()} character extraction limit`);
  }

  return sanitized;
}

export async function parseSource({ file, emailText }) {
  if (!file && !emailText?.trim()) {
    throw new AppError(400, 'Upload a PDF, XLS, XLSX spreadsheet, or enter RFQ inquiry text');
  }

  // 1. Plain Text / Email
  if (!file) {
    const trimmed = sanitizeAndBoundText(emailText);
    return {
      sourceType: 'email_text',
      sourceText: trimmed,
      filename: null,
      size: Buffer.byteLength(emailText),
      sha256: crypto.createHash('sha256').update(emailText).digest('hex')
    };
  }

  // File size validation
  if (file.size > MAX_FILE_SIZE) {
    throw new AppError(413, 'File size exceeds maximum allowed limit of 10MB');
  }

  const filename = file.originalname || 'uploaded-document';
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  const headBytes = file.buffer.subarray(0, 8);

  const isPdf =
    headBytes.subarray(0, 5).toString('ascii') === '%PDF-' ||
    file.mimetype === 'application/pdf' ||
    ext === '.pdf';

  const isXlsx =
    (headBytes[0] === 0x50 && headBytes[1] === 0x4b) || // PK zip signature
    ext === '.xlsx' ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  const isXls =
    (headBytes[0] === 0xd0 && headBytes[1] === 0xcf && headBytes[2] === 0x11 && headBytes[3] === 0xe0) || // OLE compound file
    ext === '.xls' ||
    file.mimetype === 'application/vnd.ms-excel';

  let sourceText;

  // 2. PDF Parsing
  if (isPdf) {
    try {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: file.buffer });
      const result = await parser.getText();
      await parser.destroy();

      const pageTexts =
        result.text ||
        (result.pages?.length
          ? result.pages.map(p => (typeof p === 'string' ? p : `[page ${p.num || 1}] ${p.text || ''}`)).join('\n\n')
          : '');

      sourceText = sanitizeAndBoundText(pageTexts);
    } catch (err) {
      if (err instanceof AppError) throw err;
      const msg = err.message || '';
      if (/password|encrypted|decrypt/i.test(msg)) {
        throw new AppError(422, 'The PDF is password-protected. Please upload an unprotected document.');
      }
      if (/corrupt|invalid|header|damaged/i.test(msg)) {
        throw new AppError(422, 'The PDF file is corrupted or not a valid PDF document.');
      }
      throw new AppError(
        422,
        'The PDF could not be read. Scanned or image-only PDFs require OCR before extraction.'
      );
    }
  } else if (isXlsx || isXls) {
    // 3. Spreadsheet Parsing
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(file.buffer, { type: 'buffer', dense: true, cellText: true });
      const lines = [];

      for (const sheetName of workbook.SheetNames) {
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
        rows.forEach((row, rowIndex) => {
          if (Array.isArray(row) && row.some(cell => String(cell).trim().length > 0)) {
            const formattedRow = row
              .map((cell, colIndex) => `col_${colIndex + 1}: ${String(cell).trim()}`)
              .join(' | ');
            lines.push(`[worksheet: ${sheetName}, row: ${rowIndex + 1}] ${formattedRow}`);
          }
        });
      }

      sourceText = sanitizeAndBoundText(lines.join('\n'));
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(422, 'The spreadsheet could not be read or contains invalid data structure.');
    }
  } else {
    throw new AppError(415, 'Only PDF, XLS, XLSX, or plain-text RFQ inquiry files are supported');
  }

  return {
    sourceType: isPdf ? 'pdf' : 'spreadsheet',
    sourceText,
    filename,
    size: file.size,
    sha256: crypto.createHash('sha256').update(file.buffer).digest('hex')
  };
}
