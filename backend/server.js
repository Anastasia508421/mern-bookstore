require('dotenv').config({ quiet: true });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// 2. Configurare
const app = express();
const PORT = process.env.PORT || 3000;

// Una sau mai multe origini permise, separate prin virgulă
const CORS_ORIGIN = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

// Căile către fișierele de date
const PRODUCTS_FILE = path.join(__dirname, 'data', 'books.json');

// 3. Middleware - ordinea este importantă!
app.use(helmet()); // antete HTTP de securitate
app.use(cors({ origin: CORS_ORIGIN })); // permite cereri de la frontend
app.use(compression()); // comprimă răspunsurile (gzip)
app.use(express.json()); // transformă corpul JSON al cererii în req.body

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev')); // jurnal pentru fiecare cerere
}

/**
 * FUNCȚII HELPER PENTRU DATE
 */
const readCatalog = () => {
  try {
    const data = fs.readFileSync(PRODUCTS_FILE, 'utf8');
    const parsed = JSON.parse(data);
    return { products: parsed.products || [], metadata: parsed.metadata || {} };
  } catch (error) {
    console.error('Eroare la citirea catalogului:', error.message);
    return { products: [], metadata: {} };
  }
};

const readProducts = () => readCatalog().products;

/**
 * Prețul efectiv: prețul redus, dacă există, altfel prețul standard.
 */
const effectivePrice = (product) => product.discountPrice ?? product.price;

/**
 * Valorile acceptate pentru parametrul ?sort=
 * Fiecare cheie are o funcție de comparare folosită de toSorted().
 */
const SORT_OPTIONS = {
  price_asc: (a, b) => effectivePrice(a) - effectivePrice(b), // preț crescător
  price_desc: (a, b) => effectivePrice(b) - effectivePrice(a), // preț descrescător
  title_asc: (a, b) => a.title.localeCompare(b.title, 'ro'), // titlu A → Z
  title_desc: (a, b) => b.title.localeCompare(a.title, 'ro'), // titlu Z → A
  newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt), // cele mai noi întâi
};

/**
 * Normalizează un parametru din query string.
 * Dacă parametrul apare de mai multe ori (?search=a&search=b), Express îl
 * transmite ca tablou - îl ignorăm, ca să nu apelăm .trim() pe un tablou.
 */
const queryText = (value) => (typeof value === 'string' ? value.trim() : '');

/**
 * GET /api/products - produsele active, cu filtrare, căutare și sortare
 */
app.get('/api/products', (req, res) => {
  try {
    const category = queryText(req.query.category);
    const search = queryText(req.query.search);
    const sort = queryText(req.query.sort);

    // 1. Validăm sortarea ÎNAINTE de a citi datele
    if (sort && !SORT_OPTIONS[sort]) {
      return res.status(400).json({
        success: false,
        message: `Sortare invalidă: "${sort}"`,
        allowedSorts: Object.keys(SORT_OPTIONS),
      });
    }

    // 2. Începem cu produsele active (soft delete)
    let products = readProducts().filter((p) => p.isActive === true);

    // 3. Filtrare după categorie
    if (category) {
      products = products.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }

    // 4. Căutare în titlu și autor
    if (search) {
      const keyword = search.toLowerCase();
      products = products.filter(
        (p) => p.title.toLowerCase().includes(keyword) || p.author.toLowerCase().includes(keyword)
      );
    }

    // 5. Sortare - toSorted() returnează un tablou NOU (ES2023), fără să modifice originalul
    if (sort) {
      products = products.toSorted(SORT_OPTIONS[sort]);
    }

    res.json({
      success: true,
      products,
      total: products.length,
      filters: {
        category: category || null,
        search: search || null,
        sort: sort || null,
      },
    });
  } catch (error) {
    console.error('Eroare la obținerea produselor:', error);
    res.status(500).json({ success: false, message: 'Eroare server' });
  }
});

// GET /api/products/:id - un singur produs activ
app.get('/api/products/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, message: 'ID invalid' });
  }

  const product = readProducts().find((p) => p.id === id && p.isActive === true);

  if (!product) {
    return res.status(404).json({ success: false, message: 'Produsul nu a fost găsit' });
  }

  res.json({ success: true, product });
});

// GET / și GET /api - informații despre API cu lista actualizată de endpoint-uri
const apiInfo = (req, res) => {
  res.json({
    message: 'MERN BookStore API v1',
    description: 'API pentru catalogul de cărți',
    version: '1.0.0',
    endpoints: {
      'GET /api/products': 'Toate produsele active',
      'GET /api/products?category=React': 'Filtrare după categorie',
      'GET /api/products?search=react': 'Căutare în titlu și autor',
      'GET /api/products?sort=price_asc': 'Sortare: price_asc, price_desc, title_asc, title_desc, newest',
      'GET /api/products/:id': 'Un singur produs',
    },
    author: 'SDBIS',
  });
};

app.get('/', apiInfo);
app.get('/api', apiInfo);

// 404 - nicio rută de mai sus nu a răspuns
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta ${req.method} ${req.originalUrl} nu există`,
  });
});

// 500 - middleware de eroare
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'JSON invalid în corpul cererii' });
  }
  console.error('Eroare neprevăzută:', err);
  res.status(500).json({ success: false, message: 'Eroare internă a serverului' });
});

// Pornirea serverului
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log('\nMERN BookStore API v1');
    console.log(`Serverul rulează pe: http://localhost:${PORT}`);
    console.log(`Produse: http://localhost:${PORT}/api/products\n`);
  });
}

module.exports = app;