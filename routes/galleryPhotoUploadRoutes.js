'use strict';
const express = require('express');
const multer = require('multer');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { galleryPaths } = require('../src/galleryHelpers');
const ctrl = require('../controllers/galleryPhotoUploadControllers');
const router = express.Router();

const temporaryFolder = galleryPaths().temp;
fs.mkdirSync(temporaryFolder, { recursive: true });

const upload = multer({
    storage: multer.diskStorage({
        destination: temporaryFolder,
        filename: (req, file, cb) => cb(null, crypto.randomUUID() + '.upload')
    }),
    limits: { fileSize: 15 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        if (!['image/jpeg', 'image/pjpeg'].includes(file.mimetype)) {
            return cb(new Error('Lubatud on ainult JPG/JPEG-fotod.'));
        }
        cb(null, true);
    }
}).single('photoInput');

router.get('/', ctrl.showUploadForm);
router.post('/', (req, res, next) => {
    upload(req, res, (err) => {
        if (err) {
            return res.status(400).render('galleryPhotoUpload', {
                notice: err.code === 'LIMIT_FILE_SIZE'
                    ? 'Foto on liiga suur (lubatud kuni 15 MB).'
                    : err.message,
                success: false,
                values: { alttext: req.body?.alttext || '', privacy: req.body?.privacy || '3' }
            });
        }
        next();
    });
}, ctrl.savePhoto);
module.exports = router;
