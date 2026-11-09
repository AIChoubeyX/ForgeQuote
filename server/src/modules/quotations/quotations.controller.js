import * as service from './quotations.service.js';
import * as repository from './quotations.repository.js';

export async function list(req, res) {
  const { status, search, fromDate, toDate, page, pageSize, sort, order } = req.query;
  const result = await repository.list({
    status: status || null,
    search: search || '',
    fromDate: fromDate || null,
    toDate: toDate || null,
    page: page ? Number(page) : 1,
    pageSize: pageSize ? Number(pageSize) : 20,
    sort: sort || 'issued_at',
    order: order || 'desc',
    user: req.user
  });
  res.json({
    data: result,
    total: result.total ?? result.length,
    page: result.page ?? 1,
    pageSize: result.pageSize ?? result.length,
    totalPages: result.totalPages ?? 1,
    summary: result.summary ?? {
      total: result.length,
      issued: result.filter(r => r.status === 'issued').length,
      approved: result.filter(r => r.status === 'approved').length,
      totalValueSum: 0
    }
  });
}

export async function download(req, res) {
  const { quotation, document } = await service.download(req.params.id, req.user);
  res.setHeader('Content-Type', document.content_type);
  res.setHeader('Content-Disposition', `attachment; filename="${quotation.quotation_number}.pdf"`);
  res.send(document.content);
}

export async function issue(req, res) {
  const result = await service.issue(req.params.id, req.user);
  res.json({ data: result });
}
