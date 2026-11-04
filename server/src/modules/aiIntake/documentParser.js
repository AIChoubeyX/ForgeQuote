import crypto from 'node:crypto';
import { AppError } from '../../shared/errors.js';

const maxText = 50000;

function bounded(text) {
  const value = String(text || '').replace(/\u0000/g, '').trim();
  if (!value) {
    throw new AppError(422, 'The document contains no readable text. Scanned or image-only PDFs require OCR before extraction.');
  }
  if (value.length > maxText) {
    throw new AppError(413, 'Document text exceeds the 50,000 character extraction limit');
  }
  return value;
}

export async function parseSource({ file, emailText }) {
  if (!file && !emailText?.trim()) {
    throw new AppError(400, 'Upload a PDF or spreadsheet, or enter RFQ email text');
  }
  if (!file) {
    const trimmed = bounded(emailText);
    return {
      sourceType: 'email_text',
      sourceText: trimmed,
      filename: null,
      size: Buffer.byteLength(emailText),
      sha256: crypto.createHash('sha256').update(emailText).digest('hex')
    };
  }

  const isPdf =
    file.buffer.subarray(0, 5).toString() === '%PDF-' ||
    file.mimetype === 'application/pdf' ||
    file.originalname?.toLowerCase().endsWith('.pdf');

  const isSpreadsheet =
    file.buffer.subarray(0, 2).toString() === 'PK' ||
    file.buffer.subarray(0, 4).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0])) ||
    file.originalname?.toLowerCase().endsWith('.xlsx') ||
    file.originalname?.toLowerCase().endsWith('.xls') ||
    file.mimetype?.includes('spreadsheet') ||
    file.mimetype?.includes('excel');

  let sourceText;
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
      sourceText = bounded(pageTexts);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(422, 'The PDF could not be read. Scanned or image-only PDFs require OCR before extraction.');
    }
  } else if (isSpreadsheet) {
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(file.buffer, { type: 'buffer', dense: true, cellText: true });
      const lines = [];
      for (const name of workbook.SheetNames) {
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' });
        rows.forEach((row, index) => {
          if (row.some(cell => String(cell).trim().length > 0)) {
            lines.push(
              `[worksheet ${name}, row ${index + 1}] ${row
                .map((cell, column) => `column ${column + 1}: ${String(cell)}`)
                .join(' | ')}`
            );
          }
        });
      }
      sourceText = bounded(lines.join('\n'));
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(422, 'The spreadsheet could not be read');
    }
  } else {
    throw new AppError(415, 'Only PDF, XLS, XLSX, or plain-text email content is supported');
  }

  return {
    sourceType: isPdf ? 'pdf' : 'spreadsheet',
    sourceText,
    filename: file.originalname,
    size: file.size,
    sha256: crypto.createHash('sha256').update(file.buffer).digest('hex')
  };
}
