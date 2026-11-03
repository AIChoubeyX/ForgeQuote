import * as service from './dashboard.service.js';
export async function metrics(req, res) { res.json({ data: await service.getMetrics(req.user) }); }
