import * as repository from './users.repository.js';
import { query } from '../../config/database.js';
import { AppError } from '../../shared/errors.js';
import { assertRole } from '../../shared/authorization.js';
import * as audit from '../audit/audit.service.js';
export const getEstimators = () => repository.listEstimators();
export const listUsers = () => repository.listUsers();
export async function updateRole(id, role, actor) {
  assertRole(role);
  if (id === actor.id) throw new AppError(400, 'You cannot change your own role');
  const result = await query('UPDATE users SET role=$1 WHERE id=$2 RETURNING id,name,email,role,created_at', [role, id]);
  if (!result.rows[0]) throw new AppError(404, 'User not found');
  await audit.record({ query }, { actorId: actor.id, entityType: 'user', entityId: id, action: 'role_changed', metadata: { role } });
  return result.rows[0];
}
