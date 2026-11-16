'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');
const { openGalleryDb, galleryPaths } = require('../src/galleryHelpers');

function showUploadForm(req, res) {
    return res.render('galleryPhotoUpload', {
        notice: null, success: false, values: { alttext: '', privacy: '3' }
    });
}

async function savePhoto(req, res) {
    const alttext = String(req.body.alttext || '').trim();
    const privacy = Number(req.body.privacy);
    const values = { alttext, privacy: req.body.privacy || '3' };
    const tempFile = req.file?.path;
    const paths = galleryPaths();
    const filename = crypto.randomUUID() + '.jpg';
    const createdFiles = [];
    let conn;
    let error = null;

    if (!req.file) error = 'Palun vali JPG-foto.';
    else if (alttext.length > 256) error = 'Alternatiivtekst võib olla kuni 256 tähemärki.';
    else if (![1, 2, 3].includes(privacy)) error = 'Vali korrektne privaatsustase.';
    else if (Buffer.byteLength(req.file.originalname, 'utf8') > 100) error = 'Algne failinimi on liiga pikk (kuni 100 baiti).';

    try {
        if (error) return res.status(400).render('galleryPhotoUpload', { notice: error, success: false, values });

        // MIME-tüübi kõrval kontrollime ka faili tegelikku formaati.
        const metadata = await sharp(tempFile).metadata();
        if (metadata.format !== 'jpeg') {
            return res.status(400).render('galleryPhotoUpload', {
                notice: 'Valitud fail ei ole päris JPEG-pilt.', success: false, values
            });
        }

        for (const folder of [paths.orig, paths.normal, paths.thumbs]) {
            await fs.mkdir(folder, { recursive: true });
        }

        const originalPath = path.join(paths.orig, filename);
        const normalPath = path.join(paths.normal, filename);
        const thumbnailPath = path.join(paths.thumbs, filename);

        await fs.copyFile(tempFile, originalPath);
        createdFiles.push(originalPath);

        // Tavasuuruses pildile lisame läbipaistva vesimärgi alla paremale.
        const watermark = path.resolve(__dirname, '../public/pic/gallery_watermark.png');
        const resized = await sharp(tempFile)
            .rotate()
            .resize({ width: 1200, height: 900, fit: 'inside', withoutEnlargement: true })
            .toBuffer({ resolveWithObject: true });
        const smallWatermark = await sharp(watermark)
            .resize({
                width: Math.min(190, resized.info.width),
                height: Math.min(42, resized.info.height),
                fit: 'inside', withoutEnlargement: true
            }).toBuffer();
        await sharp(resized.data)
            .composite([{ input: smallWatermark, gravity: 'southeast' }])
            .jpeg({ quality: 85 })
            .toFile(normalPath);
        createdFiles.push(normalPath);

        await sharp(tempFile)
            .rotate()
            .resize({ width: 280, height: 210, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 75 })
            .toFile(thumbnailPath);
        createdFiles.push(thumbnailPath);

        conn = await openGalleryDb();
        await conn.execute(
            `INSERT INTO galleryphotos (filename, origname, alttext, privacy, userid)
             VALUES (?, ?, ?, ?, ?)`,
            [filename, req.file.originalname, alttext || null, privacy, 1]
        );
        return res.render('galleryPhotoUpload', {
            notice: 'Foto lisati edukalt!', success: true,
            values: { alttext: '', privacy: '3' }
        });
    } catch (err) {
        console.error('Foto üleslaadimise viga:', err);
        for (const file of createdFiles) {
            await fs.unlink(file).catch(() => {});
        }
        return res.status(500).render('galleryPhotoUpload', {
            notice: 'Foto salvestamine ebaõnnestus. Vaata PuTTY veateadet ja kontrolli andmebaasitabelit.',
            success: false, values
        });
    } finally {
        if (conn) await conn.end();
        if (tempFile) await fs.unlink(tempFile).catch(() => {});
    }
}
module.exports = { showUploadForm, savePhoto };
