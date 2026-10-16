'use strict';

const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
require('dotenv').config();

const app = express();
const PORT = 5208;
const visitsFile = path.join(__dirname, 'visits.txt');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use('/pic', express.static(path.join(__dirname, 'pic')));

// Varem tehtud veebilehed.
app.get('/', (req, res) => res.render('index'));
app.get('/miks-tlu', (req, res) => res.render('miks-tlu'));
app.get('/kylastus', (req, res) => res.render('kylastus'));

app.post('/kylastus', async (req, res) => {
    const name = String(req.body.nameInput || '').trim().replace(/[;,\r\n]/g, ' ');
    if (!name) return res.status(400).send('Palun sisesta oma nimi!');

    const now = new Date();
    const date = now.toLocaleDateString('et-EE', { timeZone: 'Europe/Tallinn' });
    const time = now.toLocaleTimeString('et-EE', { timeZone: 'Europe/Tallinn' });

    try {
        await fs.appendFile(visitsFile, name + ',' + date + ',' + time + ';', 'utf8');
        return res.redirect('/viimane-kylastus');
    } catch (err) {
        console.error('Külastuse salvestamise viga:', err);
        return res.status(500).send('Külastuse salvestamine ebaõnnestus!');
    }
});

app.get('/viimane-kylastus', async (req, res) => {
    try {
        const content = await fs.readFile(visitsFile, 'utf8');
        const visits = content.split(';');
        const lastVisit = visits[visits.length - 2];
        if (!lastVisit) return res.render('viimane-kylastus', { visit: null });

        const [name, date, time] = lastVisit.split(',');
        return res.render('viimane-kylastus', { visit: { name, date, time } });
    } catch (err) {
        if (err.code === 'ENOENT') return res.render('viimane-kylastus', { visit: null });
        console.error('Külastuste faili lugemise viga:', err);
        return res.status(500).send('Külastuste faili lugemine ebaõnnestus!');
    }
});

// Uue andmebaasi kodutöö marsruudid asuvad eraldi failis.
const eestiFilmRouter = require('./routes/eestifilmRoutes');
app.use('/eestifilm', eestiFilmRouter);

app.listen(PORT, () => {
    console.log('Veebiserver töötab pordil ' + PORT);
});
