'use strict';

const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');

const app = express();
const PORT = 5208;
const visitsFile = path.join(__dirname, 'visits.txt');

// EJS lehemallid ja vormiandmete lugemine.
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));

// Pildid pic-kaustast: /pic/failinimi.jpg jne.
app.use('/pic', express.static(path.join(__dirname, 'pic')));

// Avaleht.
app.get('/', (req, res) => {
    res.render('index');
});

// Eelmises Node.js kodutoos loodud leht Express.js kujul.
app.get('/miks-tlu', (req, res) => {
    res.render('miks-tlu');
});

// Kylastaja nime sisestamise vorm.
app.get('/kylastus', (req, res) => {
    res.render('kylastus');
});

// Kylastuse salvestamine kujul: nimi,kuupaev,kellaaeg;
app.post('/kylastus', async (req, res) => {
    const name = String(req.body.nameInput || '')
        .trim()
        .replace(/[;,\r\n]/g, ' ');

    if (!name) {
        return res.status(400).send('Palun sisesta oma nimi!');
    }

    const now = new Date();
    const date = now.toLocaleDateString('et-EE', {
        timeZone: 'Europe/Tallinn'
    });
    const time = now.toLocaleTimeString('et-EE', {
        timeZone: 'Europe/Tallinn'
    });
    const visit = name + ',' + date + ',' + time + ';';

    try {
        await fs.appendFile(visitsFile, visit, 'utf8');
        res.redirect('/viimane-kylastus');
    } catch (err) {
        console.error('Kylastuse salvestamise viga:', err);
        res.status(500).send('Kylastuse salvestamine ebaonnestus!');
    }
});

// Viimase kylastuse leidmine faili viimase mittetyhja kirje jargi.
app.get('/viimane-kylastus', async (req, res) => {
    try {
        const content = await fs.readFile(visitsFile, 'utf8');
        const visits = content.split(';');
        // Iga kirje loppu pandud ; tekitab viimaseks elemendiks tyhja stringi.
        const lastVisit = visits[visits.length - 2];

        if (!lastVisit) {
            return res.render('viimane-kylastus', { visit: null });
        }

        const parts = lastVisit.split(',');
        const name = parts[0];
        const date = parts[1];
        const time = parts[2];

        res.render('viimane-kylastus', {
            visit: { name, date, time }
        });
    } catch (err) {
        if (err.code === 'ENOENT') {
            return res.render('viimane-kylastus', { visit: null });
        }
        console.error('Kylastuste faili lugemise viga:', err);
        res.status(500).send('Kylastuste faili lugemine ebaonnestus!');
    }
});

app.listen(PORT, () => {
    console.log('Veebiserver tootab pordil ' + PORT);
});
