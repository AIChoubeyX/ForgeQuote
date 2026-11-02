import { rfqSchema } from './rfqs.validation.js';
import * as service from './rfqs.service.js';
export async function list(req, res) { const page = Math.max(1, Number(req.query.page) || 1); const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20)); const result = await service.list({ search: req.query.search || '', status: req.query.status || '', page, pageSize, sort: req.query.sort || 'due_date' }); res.json({ data: result.rows, pagination: { page, pageSize, total: result.total } }); }
export async function get(req, res) { res.json({ data: await service.get(req.params.id) }); }
export async function save(req, res) { const result = await service.save(rfqSchema.parse(req.body), req.user, req.params.id); res.status(req.params.id ? 200 : 201).json({ data: result }); }
