import { Router } from 'express';
import { asyncHandler } from '../../shared/middleware/asyncHandler.js';
import { requirePermission } from '../../shared/authorization.js';
import * as controller from './commercialReviews.controller.js';
const router = Router();
router.get('/', requirePermission('commercial:review'), asyncHandler(controller.queue));
router.get('/:id', requirePermission('commercial:review'), asyncHandler(controller.get));
router.post('/:id/decision', requirePermission('commercial:review'), asyncHandler(controller.decide));
export default router;
