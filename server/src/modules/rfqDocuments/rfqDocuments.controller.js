import * as service from './rfqDocuments.service.js';
export async function list(req, res) { res.json({ data: await service.list(req.params.rfqId, req.user) }); }
export async function upload(req, res) { res.status(201).json({ data: await service.upload(req.params.rfqId, req.files, req.user) }); }
export async function download(req, res) {
  const result = await service.download(req.params.id, req.user);
  res.setHeader('Content-Type', result.document.mime_type);
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.document.original_filename)}"`);
  res.send(result.content);
}
