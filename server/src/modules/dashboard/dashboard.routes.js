import { Router } from 'express';
import { asyncHandler } from '../../shared/middleware/asyncHandler.js';
import * as controller from './dashboard.controller.js';
const router = Router();
router.get('/', asyncHandler(controller.metrics));
export default router;
