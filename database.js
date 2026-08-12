const sqlite3 = require('sqlite3').verbose();
const fs = require('fs')
const path = require('path')

const DB_FILE = process.env.DB_PATH || path.join(__dirname, 'birdshop.db')

try {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true })
  const legacyFile = path.join(__dirname, 'birdshop.db')
  if (!fs.existsSync(DB_FILE) && fs.existsSync(legacyFile) && legacyFile !== DB_FILE) {
    fs.copyFileSync(legacyFile, DB_FILE)
  }
} catch (e) {
  console.error('DB path init error:', e?.message || e)
}

const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('Database error:', err.message);
  } else {
    console.log('Connected to SQLite database:', DB_FILE);
  }
});

db.serialize(() => {

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      cost_price REAL DEFAULT 0,
      stock INTEGER DEFAULT 0,
      barcode TEXT UNIQUE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      quantity INTEGER,
      total REAL,
      invoice_number INTEGER,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      username TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'cashier'
    )
  `);

  // Safe migration for existing installations that still have the old users schema.
  db.all("PRAGMA table_info(users)", [], (err, columns) => {
    if (err || !Array.isArray(columns)) return;
    const colNames = new Set(columns.map((c) => c.name));
    if (!colNames.has('name')) {
      db.run("ALTER TABLE users ADD COLUMN name TEXT");
    }
    if (!colNames.has('email')) {
      db.run("ALTER TABLE users ADD COLUMN email TEXT");
    }
    if (!colNames.has('username')) {
      db.run("ALTER TABLE users ADD COLUMN username TEXT");
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      action TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      phone TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS supplier_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      invoice_number TEXT,
      invoice_date TEXT,
      total REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS supplier_purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_cost REAL NOT NULL,
      total REAL NOT NULL,
      FOREIGN KEY (purchase_id) REFERENCES supplier_purchases(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS supplier_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL,
      purchase_id INTEGER,
      amount REAL NOT NULL,
      method TEXT,
      notes TEXT,
      paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (purchase_id) REFERENCES supplier_purchases(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    )
  `);

  db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('shop_name', 'Smart POS System')");
  db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('invoice_title', 'Smart POS System')");
  db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('shop_phone', '')");
  db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('whatsapp_number', '')");
  db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('low_stock_threshold', '5')");

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )
  `);
  db.run("INSERT OR IGNORE INTO categories (name) SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != ''");

  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.all("PRAGMA table_info(sales)", [], (err, columns) => {
    if (err || !Array.isArray(columns)) return;
    const colNames = new Set(columns.map((c) => c.name));
    if (!colNames.has('customer_id')) {
      db.run("ALTER TABLE sales ADD COLUMN customer_id INTEGER");
    }
  });
});

module.exports = db;
