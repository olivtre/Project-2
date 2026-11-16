'use strict';
const express = require('express');
const { getGallery, sendGalleryImage } = require('../controllers/galleryControllers');
const router = express.Router();
router.get('/', getGallery);
router.get('/image/:size/:filename', sendGalleryImage);
module.exports = router;
