'use strict';
require('dotenv').config();
const fs = require('node:fs/promises');
const path = require('node:path');
const { openGalleryDb } = require('./src/galleryHelpers');

async function main() {
    let conn;
    try {
        conn = await openGalleryDb();
        const sql = await fs.readFile(path.join(__dirname, 'galleryphotos.sql'), 'utf8');
        await conn.query(sql);
        const [rows] = await conn.execute('SELECT COUNT(*) AS photoCount FROM galleryphotos');
        console.log('galleryphotos tabel on olemas. Fotosid andmebaasis:', rows[0].photoCount);
    } finally {
        if (conn) await conn.end();
    }
}
main().catch(err => {
    console.error('galleryphotos tabeli loomine/kontroll ebaõnnestus:', err.message);
    process.exitCode = 1;
});
