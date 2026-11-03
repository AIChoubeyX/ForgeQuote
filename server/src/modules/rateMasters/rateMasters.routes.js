import { Router } from 'express';
import { asyncHandler } from '../../shared/middleware/asyncHandler.js';
import { requirePermission } from '../../shared/authorization.js';
import * as controller from './rateMasters.controller.js';

const router = Router();
router.get('/', requirePermission('rate:read'), asyncHandler(controller.list));
router.get('/:id/history', requirePermission('rate:read'), asyncHandler(controller.history));
router.get('/:id/applicable', requirePermission('rate:read'), asyncHandler(controller.applicable));
router.post('/', requirePermission('rate:manage'), asyncHandler(controller.create));
export default router;
