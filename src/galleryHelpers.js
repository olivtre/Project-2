'use strict';
const path = require('node:path');
const mysql = require('mysql2/promise');

function galleryPaths() {
    const root = path.resolve(__dirname, '..');
    return {
        orig: path.resolve(root, process.env.UPLOAD_ORIGINAL_PATH || './public/gallery/orig/'),
        normal: path.resolve(root, process.env.UPLOAD_RESIZED_PATH || './public/gallery/normal/'),
        thumbs: path.resolve(root, process.env.UPLOAD_THUMBNAIL_PATH || './public/gallery/thumbs/'),
        temp: path.resolve(root, './gallery-temp/')
    };
}

async function openGalleryDb() {
    return mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME || 'if26_oliver_trei'
    });
}
module.exports = { galleryPaths, openGalleryDb };
