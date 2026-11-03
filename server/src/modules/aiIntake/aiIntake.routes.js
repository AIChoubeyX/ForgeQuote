import { Router } from 'express';
import { asyncHandler } from '../../shared/middleware/asyncHandler.js';
import { requirePermission } from '../../shared/authorization.js';
import { AppError } from '../../shared/errors.js';
import * as controller from './aiIntake.controller.js';
import * as service from './aiIntake.service.js';

const router = Router();
function parseUpload(req, res, next) {
  service.upload.single('document')(req, res, error => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') return next(new AppError(413, 'The document must be 10 MB or smaller'));
    return next(new AppError(400, 'Document upload could not be processed'));
  });
}
router.post('/extract', requirePermission('ai:intake'), parseUpload, asyncHandler(controller.extract));
router.post('/confirm', requirePermission('ai:intake'), asyncHandler(controller.confirm));
router.post('/routing-suggestions', requirePermission('ai:intake'), asyncHandler(controller.suggestRouting));
router.post('/assist', requirePermission('ai:review'), asyncHandler(controller.assist));
export default router;
