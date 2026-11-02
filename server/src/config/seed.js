import bcrypt from 'bcryptjs';
import { pool } from './database.js';

const users = [
  ['Aarav Mehta', 'estimator@forgequote.test', 'estimator'],
  ['Priya Shah', 'sales.head@forgequote.test', 'sales_head'],
  ['Vikram Rao', 'plant.head@forgequote.test', 'plant_head'],
  ['Nisha Kapoor', 'admin@forgequote.test', 'admin']
];

const password = process.env.DEMO_PASSWORD || 'ForgeQuote123!';
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const ids = {};
  for (const [name, email, role] of users) {
    const hash = await bcrypt.hash(password, 12);
    const result = await client.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,$4)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role
       RETURNING id`,
      [name, email, hash, role]
    );
    ids[email] = result.rows[0].id;
  }
  const customers = [['Apex Automotive', 'APX'], ['Northstar Engineering', 'NSE'], ['Meridian Pumps', 'MER']];
  const customerIds = [];
  for (const [name, code] of customers) {
    const result = await client.query(
      `INSERT INTO customers (name, code) VALUES ($1,$2)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
      [name, code]
    );
    customerIds.push(result.rows[0].id);
  }
  const count = await client.query('SELECT count(*)::int AS count FROM rfqs');
  if (count.rows[0].count === 0) {
    const samples = [
      ['RFQ-2026-001', customerIds[0], ids['estimator@forgequote.test'], '2026-10-28', '2026-11-12', 'in_progress', 'Repeat bracket assembly'],
      ['RFQ-2026-002', customerIds[1], ids['estimator@forgequote.test'], '2026-10-30', '2026-11-08', 'ready_for_quote', 'New pump housing enquiry'],
      ['RFQ-2026-003', customerIds[2], ids['estimator@forgequote.test'], '2026-10-31', '2026-11-18', 'draft', 'Cast impeller feasibility']
    ];
    for (const sample of samples) {
      const rfq = await client.query(
        `INSERT INTO rfqs (rfq_number, customer_id, owner_id, received_date, due_date, status, source_notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        sample
      );
      await client.query(
        `INSERT INTO rfq_parts (rfq_id, name, description, material, gross_weight, annual_volume)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [rfq.rows[0].id, 'Precision housing', 'Machined production component', 'Aluminium 6061', 4.25, 1200]
      );
    }
  }
  await client.query('COMMIT');
  console.log(`Seed complete. Demo password: ${password}`);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
