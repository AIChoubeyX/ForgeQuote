import * as service from './users.service.js';
export async function estimators(_req, res) { res.json({ data: await service.getEstimators() }); }
