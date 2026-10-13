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

// Filmide andmebaas: mysql2 ja dotenv.
// Andmed loetakse .env failist, mida GitHubi ei laadita.
const mysql = require('mysql2/promise');
require('dotenv').config();

async function openDb() {
    return mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME || 'if26_oliver_trei'
    });
}

function emptyPerson() {
    return { firstNameInput: null, lastNameInput: null, bornInput: null, deceasedInput: null };
}

function emptyMovie() {
    return { titleInput: null, yearInput: null, durationInput: null, descriptionInput: null };
}

function emptyProfession() {
    return { titleInput: null, descriptionInput: null };
}

function text(value) {
    return String(value ?? '').trim();
}

function parseRealDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const result = new Date(value + 'T00:00:00Z');
    if (Number.isNaN(result.getTime())) return null;
    return result.toISOString().slice(0, 10) === value ? result : null;
}

function dateTodayEstonia() {
    return new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Tallinn',
        year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
}

// Filmidega seotud lehtede avaleht.
app.get('/eestifilm', (req, res) => {
    res.render('eestifilm');
});

// Andmebaasi salvestatud isikute nimekiri.
app.get('/eestifilm/inimesed', async (req, res) => {
    let conn;
    try {
        conn = await openDb();
        const [rows] = await conn.execute(`
            SELECT first_name, last_name,
                   DATE_FORMAT(born, '%d.%m.%Y') AS bornText,
                   IF(deceased IS NULL, '', DATE_FORMAT(deceased, '%d.%m.%Y')) AS deceasedText
            FROM person ORDER BY last_name, first_name
        `);
        res.render('eestifilm-inimesed', { people: rows, notice: null });
    } catch (err) {
        console.error('Isikute lugemise viga:', err);
        res.status(500).render('eestifilm-inimesed', {
            people: [], notice: 'Andmebaasiga ühendamisel tekkis viga.'
        });
    } finally {
        if (conn) await conn.end();
    }
});

// Isikute lisamise vorm. GET korral peavad väljad olema tühjad.
app.get('/eestifilm/inimesed_lisa', (req, res) => {
    res.render('eestifilm-inimesed-lisa', { values: emptyPerson(), notice: null });
});

app.post('/eestifilm/inimesed_lisa', async (req, res) => {
    const values = {
        firstNameInput: text(req.body.firstNameInput),
        lastNameInput: text(req.body.lastNameInput),
        bornInput: text(req.body.bornInput),
        deceasedInput: text(req.body.deceasedInput)
    };
    const { firstNameInput, lastNameInput, bornInput, deceasedInput } = values;
    const bornDate = parseRealDate(bornInput);
    const today = dateTodayEstonia();
    let error = null;

    if (!firstNameInput || firstNameInput.length > 100) {
        error = 'Sisesta korrektne eesnimi (maksimaalselt 100 tähemärki).';
    } else if (!lastNameInput || lastNameInput.length > 100) {
        error = 'Sisesta korrektne perekonnanimi (maksimaalselt 100 tähemärki).';
    } else if (!bornDate || bornInput > today) {
        error = 'Sünnikuupäev peab olema reaalne ega tohi olla tulevikus.';
    } else if (deceasedInput !== '') {
        const deceasedDate = parseRealDate(deceasedInput);
        if (!deceasedDate || deceasedInput > today || deceasedDate < bornDate) {
            error = 'Surmakuupäev peab olema reaalne, ei tohi olla tulevikus ega enne sünnikuupäeva.';
        }
    }

    if (error) {
        return res.status(400).render('eestifilm-inimesed-lisa', { values, notice: error });
    }

    let conn;
    try {
        conn = await openDb();
        await conn.execute(
            'INSERT INTO person (first_name, last_name, born, deceased) VALUES (?, ?, ?, ?)',
            [firstNameInput, lastNameInput, bornInput, deceasedInput || null]
        );
        // Korrektse salvestamise järel on sisendid tühjad.
        res.render('eestifilm-inimesed-lisa', {
            values: emptyPerson(), notice: 'Isik lisati edukalt andmebaasi!'
        });
    } catch (err) {
        console.error('Isiku lisamise viga:', err);
        res.status(500).render('eestifilm-inimesed-lisa', {
            values, notice: 'Salvestamisel tekkis andmebaasi viga. Sisestatud andmed jäid alles.'
        });
    } finally {
        if (conn) await conn.end();
    }
});

// UUS TABEL 1: movie (filmid).
app.get('/eestifilm/filmid_lisa', (req, res) => {
    res.render('eestifilm-filmid-lisa', { values: emptyMovie(), notice: null });
});

app.post('/eestifilm/filmid_lisa', async (req, res) => {
    const values = {
        titleInput: text(req.body.titleInput),
        yearInput: text(req.body.yearInput),
        durationInput: text(req.body.durationInput),
        descriptionInput: text(req.body.descriptionInput)
    };
    const { titleInput, yearInput, durationInput, descriptionInput } = values;
    const year = Number(yearInput);
    const duration = Number(durationInput);
    let error = null;

    if (!titleInput || titleInput.length > 100) {
        error = 'Filmi pealkiri peab olema täidetud (kuni 100 tähemärki).';
    } else if (!/^\d{4}$/.test(yearInput) || !Number.isInteger(year) || year < 1888 || year > 2999) {
        error = 'Sisesta korrektne neljakohaline väljalaskeaasta.';
    } else if (!/^\d+$/.test(durationInput) || !Number.isInteger(duration) || duration < 1) {
        error = 'Filmi kestus peab olema positiivne täisarv minutites.';
    } else if (descriptionInput.length > 1000) {
        error = 'Kirjeldus võib olla kuni 1000 tähemärki.';
    }

    if (error) {
        return res.status(400).render('eestifilm-filmid-lisa', { values, notice: error });
    }

    let conn;
    try {
        conn = await openDb();
        await conn.execute(
            'INSERT INTO movie (title, release_year, duration_minutes, description) VALUES (?, ?, ?, ?)',
            [titleInput, year, duration, descriptionInput || null]
        );
        res.render('eestifilm-filmid-lisa', {
            values: emptyMovie(), notice: 'Film lisati edukalt andmebaasi!'
        });
    } catch (err) {
        console.error('Filmi lisamise viga:', err);
        res.status(500).render('eestifilm-filmid-lisa', {
            values, notice: 'Salvestamisel tekkis andmebaasi viga. Sisestatud andmed jäid alles.'
        });
    } finally {
        if (conn) await conn.end();
    }
});

// UUS TABEL 2: profession (filmiga seotud ametid).
app.get('/eestifilm/ametid_lisa', (req, res) => {
    res.render('eestifilm-ametid-lisa', { values: emptyProfession(), notice: null });
});

app.post('/eestifilm/ametid_lisa', async (req, res) => {
    const values = {
        titleInput: text(req.body.titleInput),
        descriptionInput: text(req.body.descriptionInput)
    };
    const { titleInput, descriptionInput } = values;
    let error = null;

    if (!titleInput || titleInput.length > 50) {
        error = 'Ameti nimetus peab olema täidetud (kuni 50 tähemärki).';
    } else if (descriptionInput.length > 1000) {
        error = 'Kirjeldus võib olla kuni 1000 tähemärki.';
    }

    if (error) {
        return res.status(400).render('eestifilm-ametid-lisa', { values, notice: error });
    }

    let conn;
    try {
        conn = await openDb();
        await conn.execute(
            'INSERT INTO profession (title, description) VALUES (?, ?)',
            [titleInput, descriptionInput || null]
        );
        res.render('eestifilm-ametid-lisa', {
            values: emptyProfession(), notice: 'Amet lisati edukalt andmebaasi!'
        });
    } catch (err) {
        console.error('Ameti lisamise viga:', err);
        res.status(500).render('eestifilm-ametid-lisa', {
            values, notice: 'Salvestamisel tekkis andmebaasi viga. Sisestatud andmed jäid alles.'
        });
    } finally {
        if (conn) await conn.end();
    }
});

app.listen(PORT, () => {
    console.log('Veebiserver tootab pordil ' + PORT);
});
