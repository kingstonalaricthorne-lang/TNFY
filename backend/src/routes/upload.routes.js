const router = require('express').Router();
const { getPresignedUrl, deleteImage } = require('../controllers/upload.controller');
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

router.use(authenticate, requireAdmin);

router.post('/presign', getPresignedUrl);
router.delete('/', deleteImage);

module.exports = router;
