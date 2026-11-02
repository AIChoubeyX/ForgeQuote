import * as service from './dashboard.service.js';
export async function metrics(_req, res) { res.json({ data: await service.getMetrics() }); }
