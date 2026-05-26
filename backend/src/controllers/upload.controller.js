const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const ApiError = require('../utils/ApiError');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

async function getPresignedUrl(req, res, next) {
  try {
    const { contentType, folder = 'products' } = req.body;
    if (!ALLOWED_TYPES.includes(contentType)) {
      throw ApiError.badRequest('Invalid file type. Allowed: jpeg, png, webp, gif');
    }

    const ext = contentType.split('/')[1];
    const key = `${folder}/${uuidv4()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 300 });
    const publicUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    res.json({ success: true, data: { uploadUrl: url, publicUrl, key } });
  } catch (err) {
    next(err);
  }
}

async function deleteImage(req, res, next) {
  try {
    const { key } = req.body;
    if (!key) throw ApiError.badRequest('Image key required');

    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
    }));

    res.json({ success: true, message: 'Image deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPresignedUrl, deleteImage };
