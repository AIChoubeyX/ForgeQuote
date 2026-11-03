import * as service from './users.service.js';
export async function estimators(_req, res) { res.json({ data: await service.getEstimators() }); }
export async function list(_req, res) { res.json({ data: await service.listUsers() }); }
export async function updateRole(req, res) { res.json({ data: await service.updateRole(req.params.id, req.body.role, req.user) }); }
