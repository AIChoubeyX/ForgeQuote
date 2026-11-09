import { Router } from 'express';
import { asyncHandler } from '../../shared/middleware/asyncHandler.js';
import { requirePermission } from '../../shared/authorization.js';
import * as controller from './quotations.controller.js';

const router = Router();
router.get('/', requirePermission('quotation:read'), asyncHandler(controller.list));
router.get('/:id/pdf', requirePermission('quotation:download'), asyncHandler(controller.download));
router.post('/:id/issue', requirePermission('quotation:issue'), asyncHandler(controller.issue));

export default router;
