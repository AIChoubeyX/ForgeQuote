import { decisionSchema } from './routingReviews.validation.js';
import * as service from './routingReviews.service.js';
export async function queue(req, res) { res.json({ data: await service.queue(req.query.status) }); }
export async function get(req, res) { res.json({ data: await service.get(req.params.id) }); }
export async function decide(req, res) { res.json({ data: await service.decide(req.params.id, { ...decisionSchema.parse(req.body), rowVersion: req.body.rowVersion }, req.user) }); }
