import * as service from './customers.service.js';
export async function list(_req, res) { res.json({ data: await service.listCustomers() }); }
