export async function record(client, { actorId, entityType = 'rfq', entityId, action, metadata }) {
  await client.query('INSERT INTO audit_events (actor_id,entity_type,entity_id,action,metadata) VALUES ($1,$2,$3,$4,$5)', [actorId, entityType, entityId, action, JSON.stringify(metadata || {})]);
}
