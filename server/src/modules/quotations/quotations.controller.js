import * as service from './quotations.service.js';
import * as repository from './quotations.repository.js';

export async function list(req, res) {
  const result = await repository.list(req.query.status, req.user);
  res.json({ data: result });
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
