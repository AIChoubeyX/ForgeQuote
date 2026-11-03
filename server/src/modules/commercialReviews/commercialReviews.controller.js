import { decisionSchema } from './commercialReviews.validation.js';
import * as service from './commercialReviews.service.js';
export async function queue(req, res) { res.json({ data: await service.queue(req.query.status || null, req.query.highValue === 'true') }); }
export async function get(req, res) { res.json({ data: await service.get(req.params.id) }); }
export async function decide(req, res) { res.json({ data: await service.decide(req.params.id, decisionSchema.parse(req.body), req.user) }); }
