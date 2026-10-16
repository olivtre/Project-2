'use strict';

const express = require('express');
const router = express.Router();
const {
    eestifilm,
    inimesed,
    inimesedAdd,
    inimesedAddPost,
    filmidAdd,
    filmidAddPost,
    ametidAdd,
    ametidAddPost
} = require('../controllers/eestifilmControllers');

router.get('/', eestifilm);
router.get('/inimesed', inimesed);
router.route('/inimesed_lisa').get(inimesedAdd).post(inimesedAddPost);
router.route('/filmid_lisa').get(filmidAdd).post(filmidAddPost);
router.route('/ametid_lisa').get(ametidAdd).post(ametidAddPost);

module.exports = router;
