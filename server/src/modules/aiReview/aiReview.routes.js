import { Router } from 'express';
import { asyncHandler } from '../../shared/middleware/asyncHandler.js';
import { requirePermission } from '../../shared/authorization.js';
import * as controller from './aiReview.controller.js';

const router = Router();

router.post('/', requirePermission('ai:review'), asyncHandler(controller.review));
router.post('/:type', requirePermission('ai:review'), asyncHandler(controller.review));
router.get('/history', requirePermission('ai:review'), asyncHandler(controller.history));

export default router;

