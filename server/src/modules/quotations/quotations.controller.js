import * as service from './quotations.service.js';
import * as repository from './quotations.repository.js';
export async function list(req, res) { res.json({ data: await repository.list(req.query.status, req.user) }); }
export async function download(req, res) {
  const result = await service.download(req.params.id, req.user);
  res.setHeader('Content-Type', result.document.content_type);
  res.setHeader('Content-Disposition', `attachment; filename="${result.quotation.quotation_number}.pdf"`);
  res.send(result.document.content);
}
