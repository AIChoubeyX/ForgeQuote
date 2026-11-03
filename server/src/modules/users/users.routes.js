import { Router } from 'express';
import { asyncHandler } from '../../shared/middleware/asyncHandler.js';
import { requirePermission } from '../../shared/authorization.js';
import * as controller from './users.controller.js';
const router = Router();
router.get('/estimators', asyncHandler(controller.estimators));
router.get('/', requirePermission('users:read'), asyncHandler(controller.list));
router.patch('/:id/role', requirePermission('users:update'), asyncHandler(controller.updateRole));
export default router;
