import { rateSchema } from './rateMasters.validation.js';
import * as service from './rateMasters.service.js';

export async function list(req, res) { res.json({ data: await service.list({ search: req.query.search, category: req.query.category, status: req.query.status, effective: req.query.effective }) }); }
export async function history(req, res) { res.json({ data: await service.getHistory(req.params.id) }); }
export async function applicable(req, res) { res.json({ data: await service.applicable(req.params.id, req.query.date || new Date().toISOString().slice(0, 10)) }); }
export async function create(req, res) { res.status(201).json({ data: await service.create(rateSchema.parse(req.body), req.user) }); }
