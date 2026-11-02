import { Router } from 'express';
import { asyncHandler } from '../../shared/middleware/asyncHandler.js';
import * as controller from './rfqs.controller.js';
const router = Router();
router.get('/', asyncHandler(controller.list));
router.get('/:id', asyncHandler(controller.get));
router.post('/', asyncHandler(controller.save));
router.put('/:id', asyncHandler(controller.save));
export default router;
