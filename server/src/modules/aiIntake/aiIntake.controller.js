import * as service from './aiIntake.service.js';
export async function extract(req, res) { res.status(201).json({ data: await service.extract(req) }); }
export async function confirm(req, res) { res.status(201).json({ data: await service.confirm(req.body, req.user) }); }
export async function suggestRouting(req, res) { res.json({ data: await service.suggestRouting(req.body, req.user) }); }
export async function assist(req, res) { res.json({ data: await service.assist(req.body, req.user) }); }
