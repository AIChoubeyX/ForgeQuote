import { costingSchema } from './costing.validation.js';
import * as service from './costing.service.js';

export async function getForRfq(req, res) { res.json({ data: await service.getForRfq(req.params.rfqId, req.user) }); }
export async function get(req, res) { res.json({ data: await service.get(req.params.id, req.user) }); }
export async function aiContext(req, res) { res.json({ data: await service.aiContext(req.params.id, req.user) }); }
export async function saveDraft(req, res) { res.status(201).json({ data: await service.saveDraft(req.params.rfqId, costingSchema.parse(req.body), req.user) }); }
export async function submit(req, res) { res.json({ data: await service.submit(req.params.id, req.user) }); }
