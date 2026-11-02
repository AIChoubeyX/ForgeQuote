import { Router } from 'express';
import { asyncHandler } from '../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../shared/middleware/authenticate.js';
import * as controller from './auth.controller.js';
const router = Router();
router.post('/login', asyncHandler(controller.login));
router.post('/logout', controller.logout);
router.get('/me', authenticate, asyncHandler(controller.me));
export default router;
