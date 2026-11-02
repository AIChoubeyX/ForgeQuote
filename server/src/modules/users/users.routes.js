import { Router } from 'express';
import { asyncHandler } from '../../shared/middleware/asyncHandler.js';
import * as controller from './users.controller.js';
const router = Router();
router.get('/estimators', asyncHandler(controller.estimators));
export default router;
