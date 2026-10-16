'use strict';

const mysql = require('mysql2/promise');

// .env keskkonnamuutujad laetakse index.js failis enne marsruute.
async function openDb() {
    return mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME || 'if26_oliver_trei'
    });
}

function text(value) {
    return String(value ?? '').trim();
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

// Tagastab kuupäeva objekti ainult päriselt eksisteeriva YYYY-MM-DD kuupäeva puhul.
function parseRealDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const parsed = new Date(value + 'T00:00:00Z');
    if (!Number.isFinite(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10) === value ? parsed : null;
}

function dateTodayEstonia() {
    return new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Europe/Tallinn', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
}

// GET /eestifilm
const eestifilm = (req, res) => {
    res.render('eestifilm');
};

// GET /eestifilm/inimesed
const inimesed = async (req, res) => {
    let conn;
    try {
        conn = await openDb();
        const [rows] = await conn.execute(`
            SELECT first_name, last_name,
                   DATE_FORMAT(born, '%d.%m.%Y') AS bornText,
                   IF(deceased IS NULL, '', DATE_FORMAT(deceased, '%d.%m.%Y')) AS deceasedText
            FROM person ORDER BY last_name, first_name
        `);
        return res.render('eestifilm-inimesed', { people: rows, notice: null });
    } catch (err) {
        console.error('Isikute lugemise viga:', err);
        return res.status(500).render('eestifilm-inimesed', {
            people: [], notice: 'Andmebaasiga ühendamisel tekkis viga.'
        });
    } finally {
        if (conn) await conn.end();
    }
};

// GET /eestifilm/inimesed_lisa – alguses tühjad väljad.
const inimesedAdd = (req, res) => {
    res.render('eestifilm-inimesed-lisa', { values: emptyPerson(), notice: null });
};

// POST /eestifilm/inimesed_lisa – vigase sisestuse korral säilitame väljad.
const inimesedAddPost = async (req, res) => {
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
        return res.render('eestifilm-inimesed-lisa', {
            values: emptyPerson(), notice: 'Isik lisati edukalt andmebaasi!'
        });
    } catch (err) {
        console.error('Isiku lisamise viga:', err);
        return res.status(500).render('eestifilm-inimesed-lisa', {
            values, notice: 'Salvestamisel tekkis andmebaasi viga. Sisestatud andmed jäid alles.'
        });
    } finally {
        if (conn) await conn.end();
    }
};

// GET /eestifilm/filmid_lisa
const filmidAdd = (req, res) => {
    res.render('eestifilm-filmid-lisa', { values: emptyMovie(), notice: null });
};

// POST /eestifilm/filmid_lisa
const filmidAddPost = async (req, res) => {
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
    } else if (!/^\d+$/.test(durationInput) || !Number.isSafeInteger(duration) || duration < 1) {
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
        return res.render('eestifilm-filmid-lisa', {
            values: emptyMovie(), notice: 'Film lisati edukalt andmebaasi!'
        });
    } catch (err) {
        console.error('Filmi lisamise viga:', err);
        return res.status(500).render('eestifilm-filmid-lisa', {
            values, notice: 'Salvestamisel tekkis andmebaasi viga. Sisestatud andmed jäid alles.'
        });
    } finally {
        if (conn) await conn.end();
    }
};

// GET /eestifilm/ametid_lisa
const ametidAdd = (req, res) => {
    res.render('eestifilm-ametid-lisa', { values: emptyProfession(), notice: null });
};

// POST /eestifilm/ametid_lisa
const ametidAddPost = async (req, res) => {
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
        return res.render('eestifilm-ametid-lisa', {
            values: emptyProfession(), notice: 'Amet lisati edukalt andmebaasi!'
        });
    } catch (err) {
        console.error('Ameti lisamise viga:', err);
        return res.status(500).render('eestifilm-ametid-lisa', {
            values, notice: 'Salvestamisel tekkis andmebaasi viga. Sisestatud andmed jäid alles.'
        });
    } finally {
        if (conn) await conn.end();
    }
};

module.exports = {
    eestifilm,
    inimesed,
    inimesedAdd,
    inimesedAddPost,
    filmidAdd,
    filmidAddPost,
    ametidAdd,
    ametidAddPost
};
