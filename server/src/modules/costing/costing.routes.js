import { Router } from 'express';
import { asyncHandler } from '../../shared/middleware/asyncHandler.js';
import { requirePermission } from '../../shared/authorization.js';
import * as controller from './costing.controller.js';

const router = Router();
router.get('/rfqs/:rfqId', requirePermission('costing:read'), asyncHandler(controller.getForRfq));
router.post('/rfqs/:rfqId/drafts', requirePermission('costing:write'), asyncHandler(controller.saveDraft));
router.get('/:id', requirePermission('costing:read'), asyncHandler(controller.get));
router.get('/:id/ai-context', requirePermission('costing:read'), asyncHandler(controller.aiContext));
router.post('/:id/submit', requirePermission('costing:write'), asyncHandler(controller.submit));
export default router;
