const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Disk Storage with sanitized cryptographic file naming
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
        const randomName = 'img_' + Date.now() + '_' + crypto.randomBytes(8).toString('hex') + safeExt;
        cb(null, randomName);
    }
});

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are permitted.'), false);
    }
};

const upload = multer({
    storage,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 5
    },
    fileFilter
});

/**
 * Validate and sanitize Base64 Encoded Image Data URI
 */
function validateAndSanitizeBase64Image(base64String) {
    if (!base64String || typeof base64String !== 'string') return null;

    // Fast check for data URI format
    const matches = base64String.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!matches) {
        // If it's already an external HTTPS URL (e.g. Unsplash or dicebear avatar), allow safe https url
        if (base64String.startsWith('https://')) {
            return base64String.trim();
        }
        return null;
    }

    const mimeType = matches[1].toLowerCase();
    const dataBuffer = Buffer.from(matches[2], 'base64');

    // Check size <= 5MB
    if (dataBuffer.length > MAX_FILE_SIZE) {
        throw new Error('Image size exceeds maximum allowed limit (5MB).');
    }

    // Verify magic bytes
    if (mimeType === 'png' && !dataBuffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
        throw new Error('Corrupted or invalid PNG image file header.');
    }
    if ((mimeType === 'jpeg' || mimeType === 'jpg') && (dataBuffer[0] !== 0xFF || dataBuffer[1] !== 0xD8)) {
        throw new Error('Corrupted or invalid JPEG image file header.');
    }

    return base64String;
}

module.exports = {
    upload,
    validateAndSanitizeBase64Image,
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE
};
