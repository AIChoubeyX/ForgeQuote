import { Router } from 'express';
import { asyncHandler } from '../../shared/middleware/asyncHandler.js';
import * as controller from './customers.controller.js';
const router = Router();
router.get('/', asyncHandler(controller.list));
export default router;
