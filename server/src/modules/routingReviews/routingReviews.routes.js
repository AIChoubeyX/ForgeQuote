import { Router } from 'express';
import { asyncHandler } from '../../shared/middleware/asyncHandler.js';
import { requirePermission } from '../../shared/authorization.js';
import * as controller from './routingReviews.controller.js';
const router = Router();
router.get('/', requirePermission('routing:review'), asyncHandler(controller.queue));
router.get('/:id', requirePermission('routing:review'), asyncHandler(controller.get));
router.post('/:id/decision', requirePermission('routing:approve'), asyncHandler(controller.decide));
export default router;
