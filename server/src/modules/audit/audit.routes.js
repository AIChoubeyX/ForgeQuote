import { Router } from 'express';
import { asyncHandler } from '../../shared/middleware/asyncHandler.js';
import { requirePermission } from '../../shared/authorization.js';
import * as controller from './audit.controller.js';

const router = Router();
router.get('/', requirePermission('audit:read'), asyncHandler(controller.list));
export default router;
