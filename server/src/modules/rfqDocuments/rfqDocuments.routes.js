import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../../shared/middleware/asyncHandler.js';
import { requirePermission } from '../../shared/authorization.js';
import { AppError } from '../../shared/errors.js';
import * as controller from './rfqDocuments.controller.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 10 } });
function parseUpload(req, res, next) {
  upload.array('documents', 10)(req, res, error => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') return next(new AppError(413, 'Each document must be 10 MB or smaller'));
    if (error.code === 'LIMIT_FILE_COUNT') return next(new AppError(413, 'You can upload at most 10 documents at a time'));
    return next(new AppError(400, 'Document upload could not be processed'));
  });
}
router.get('/rfqs/:rfqId/documents', requirePermission('rfq:documents:read'), asyncHandler(controller.list));
router.post('/rfqs/:rfqId/documents', requirePermission('rfq:documents:write'), parseUpload, asyncHandler(controller.upload));
router.get('/documents/:id', requirePermission('rfq:documents:read'), asyncHandler(controller.download));
export default router;
