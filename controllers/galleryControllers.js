'use strict';
const path = require('node:path');
const { openGalleryDb, galleryPaths } = require('../src/galleryHelpers');

async function getGallery(req, res) {
    let conn;
    try {
        conn = await openGalleryDb();
        const [photos] = await conn.execute(
            `SELECT filename, alttext, created FROM galleryphotos
             WHERE privacy >= ? AND deleted IS NULL
             ORDER BY id DESC`, [2]
        );
        return res.render('gallery', { photos, notice: null });
    } catch (err) {
        console.error('Galerii lugemise viga:', err);
        return res.status(500).render('gallery', {
            photos: [], notice: 'Galerii andmeid ei õnnestunud lugeda. Kontrolli galleryphotos tabelit.'
        });
    } finally {
        if (conn) await conn.end();
    }
}

async function sendGalleryImage(req, res) {
    const { size, filename } = req.params;
    if (!['normal', 'thumbs'].includes(size) || !/^[0-9a-f-]{36}\.jpg$/.test(filename)) {
        return res.sendStatus(404);
    }
    let conn;
    try {
        conn = await openGalleryDb();
        // Privaatseid (privacy=1) ega kustutatuks märgitud pilte ei väljasta.
        const [rows] = await conn.execute(
            `SELECT id FROM galleryphotos
             WHERE filename = ? AND privacy >= 2 AND deleted IS NULL LIMIT 1`,
            [filename]
        );
        if (rows.length === 0) return res.sendStatus(404);
        return res.sendFile(path.join(galleryPaths()[size], filename));
    } catch (err) {
        console.error('Galerii foto lugemise viga:', err);
        return res.sendStatus(500);
    } finally {
        if (conn) await conn.end();
    }
}
module.exports = { getGallery, sendGalleryImage };
