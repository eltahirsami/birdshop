require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const { getMachineId, isLicensed, saveLicense } = require('./license')
const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const db = require('./database');
const cron = require('node-cron');
const fs = require('fs');

const DB_FILE = process.env.DB_PATH || path.join(__dirname, 'birdshop.db')



const app = express();

/* =========================
   Middlewares
========================= */
app.use(express.json());

// License check
app.get('/license/status', (req, res) => {
  res.json({
    licensed: isLicensed(),
    machineId: getMachineId()
  })
})

app.post('/license/activate', (req, res) => {
  const { key } = req.body
  const { generateLicenseKey } = require('./license')
  const machineId = getMachineId()
  const validKey = generateLicenseKey(machineId)
  if (key.trim().toUpperCase() === validKey) {
    saveLicense(key)
    res.json({ success: true, message: 'تم التفعيل بنجاح' })
  } else {
    res.status(400).json({ success: false, message: 'كود غير صحيح' })
  }
})
app.use(express.urlencoded({ extended: true }));

/* =========================
   Session
========================= */
app.use(
  session({
    name: 'birdshop.sid',
    secret: process.env.SESSION_SECRET || 'birdshop_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000
    }
  })
);

/* =========================
   Middlewares الحماية
========================= */
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login.html');
  }
  next();
}

function requireDeveloper(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'developer') {
    return res.status(403).json({ message: 'غير مصرح' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ message: 'غير مصرح' });
  }
  next();
}

function requireCashier(req, res, next) {
  if (!req.session.user || !['admin', 'cashier', 'developer'].includes(req.session.user.role)) {
    return res.status(403).json({ message: 'غير مصرح' });
  }
  next();
}

/* =========================
   سجل الأحداث
========================= */
function logAction(userId, username, action, details) {
  db.run(
    "INSERT INTO logs (user_id, username, action, details) VALUES (?,?,?,?)",
    [userId, username, action, details]
  );
}

/* =========================
   ملفات الواجهة
========================= */
app.use((req, res, next) => {
  const publicPaths = ['/license.html', '/license/status', '/license/activate', '/login.html', '/style.css']
  const isPublic = publicPaths.some(p => req.path.startsWith(p))
  if (!isPublic && !isLicensed()) {
    return res.redirect('/license.html')
  }
  next()
})

app.use(express.static(path.join(__dirname, 'frontend')));
app.use('/app', requireLogin, express.static(path.join(__dirname, 'frontend')));


/* =========================
   الصفحة الرئيسية
========================= */
app.get('/', (req, res) => {
  if (!isLicensed()) {
    return res.redirect('/license.html')
  }
  res.redirect('/app')
})

/* =========================
   تسجيل الدخول
========================= */
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username=?", [username], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'بيانات غير صحيحة' });
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: 'بيانات غير صحيحة' });
    }
    req.session.user = { id: user.id, role: user.role, username: user.username };
    res.json({ message: "تم تسجيل الدخول" });
  });
});

/* =========================
   فحص الجلسة
========================= */
app.get('/me', (req, res) => {
  res.json({ session: req.session.user || null });
});

/* =========================
   تسجيل الخروج
========================= */
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "تم تسجيل الخروج" });
  });
});

/* =========================
   المنتجات
========================= */
app.get('/products', requireLogin, (req, res) => {
  db.all("SELECT * FROM products", [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

app.post('/products', requireLogin, requireCashier, (req, res) => {
 const { name, category, price, cost_price, stock, barcode } = req.body;
  if (!name || !category || price == null) {
    return res.status(400).json({ error: 'بيانات ناقصة', message: 'بيانات ناقصة' });
  }
  db.run(
  "INSERT INTO products (name,category,price,cost_price,stock,barcode) VALUES (?,?,?,?,?,?)",
  [name, category, price, cost_price, stock, barcode || null],
    function(err) {
      if (err) return res.status(500).json({ error: 'Insert failed', message: 'فشل إضافة المنتج' });
      logAction(req.session.user.id, req.session.user.username, 'إضافة منتج', name);
      res.json({ message: 'تمت الإضافة', productId: this.lastID });
    }
  );
});

app.put('/products/:id', requireLogin, requireCashier, (req, res) => {
  const { name, category, price, cost_price, stock, barcode } = req.body;
  const id = req.params.id;
  db.run(
  "UPDATE products SET name=?,category=?,price=?,cost_price=?,stock=?,barcode=? WHERE id=?",
  [name, category, price, cost_price, stock, barcode || null, id],
    function(err) {
      if (err) return res.status(500).json({ error: "فشل التعديل", message: "فشل التعديل" });
      logAction(req.session.user.id, req.session.user.username, 'تعديل منتج', 'id: ' + id + ' - ' + name);
      res.json({ message: "تم التعديل" });
    }
  );
});

app.delete('/products/:id', requireLogin, requireAdmin, (req, res) => {
  const id = req.params.id;
  db.get("SELECT name FROM products WHERE id=?", [id], (err, product) => {
    db.run("DELETE FROM products WHERE id=?", [id], function(err) {
      if (err) return res.status(500).json({ error: "فشل الحذف" });
      logAction(req.session.user.id, req.session.user.username, 'حذف منتج', 'id: ' + id + (product ? ' - ' + product.name : ''));
      res.json({ message: "تم حذف المنتج" });
    });
  });
});

/* =========================
   البيع
========================= */
app.post('/sales', requireLogin, requireCashier, (req, res) => {
  const { product_id, quantity } = req.body;
  if (!product_id || !quantity) {
    return res.status(400).json({ error: 'بيانات ناقصة' });
  }
  db.get("SELECT price,stock,name FROM products WHERE id=?", [product_id], (err, product) => {
    if (err || !product) return res.status(404).json({ error: 'المنتج غير موجود' });
    if (product.stock < quantity) return res.status(400).json({ error: 'المخزون غير كافٍ' });

    const total = product.price * quantity;
    db.get("SELECT MAX(invoice_number) as last FROM sales", [], (err, row) => {
      const invoiceNumber = (row?.last || 0) + 1;
      db.run(
        "INSERT INTO sales (product_id,quantity,total,invoice_number,user_id) VALUES (?,?,?,?,?)",
        [product_id, quantity, total, invoiceNumber, req.session.user.id],
        function(err) {
          if (err) { console.error(err); return res.status(500).json({ error: 'فشل البيع' }); }
          db.run("UPDATE products SET stock = stock - ? WHERE id=?", [quantity, product_id]);
          logAction(req.session.user.id, req.session.user.username, 'بيع', product.name + ' x' + quantity + ' = ' + total);
          res.json({ message: "تم البيع بنجاح", invoice: invoiceNumber });
        }
      );
    });
  });
});

app.post('/sales/checkout', requireLogin, requireCashier, (req, res) => {
  const items = req.body.items;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'سلة فارغة' });
  }
  const merged = {};
  for (const row of items) {
    const pid = parseInt(row.product_id, 10);
    const q = parseInt(row.quantity, 10);
    if (!pid || !q || q < 1) {
      return res.status(400).json({ error: 'بيانات ناقصة' });
    }
    merged[pid] = (merged[pid] || 0) + q;
  }
  const productIds = Object.keys(merged).map((k) => parseInt(k, 10));
  const placeholders = productIds.map(() => '?').join(',');
  db.all(
    `SELECT id, price, stock, name FROM products WHERE id IN (${placeholders})`,
    productIds,
    (err, products) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!products || products.length !== productIds.length) {
        return res.status(404).json({ error: 'منتج غير موجود' });
      }
      const byId = {};
      products.forEach((p) => { byId[p.id] = p; });
      for (const pid of productIds) {
        const need = merged[pid];
        if (byId[pid].stock < need) {
          return res.status(400).json({ error: 'المخزون غير كافٍ: ' + byId[pid].name });
        }
      }

      db.get("SELECT MAX(invoice_number) as last FROM sales", [], (err2, row) => {
        if (err2) return res.status(500).json({ error: 'Database error' });
        const invoiceNumber = (row?.last || 0) + 1;
        const userId = req.session.user.id;
        const uname = req.session.user.username;

        db.run('BEGIN IMMEDIATE TRANSACTION', (beginErr) => {
          if (beginErr) return res.status(500).json({ error: 'فشل بدء المعاملة' });

          function step(i) {
            if (i >= productIds.length) {
              db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                  return res.status(500).json({ error: 'فشل تأكيد البيع' });
                }
                const summary = productIds
                  .map((pid) => `${byId[pid].name} ×${merged[pid]}`)
                  .join('، ');
                logAction(userId, uname, 'بيع', `فاتورة ${invoiceNumber}: ${summary}`);
                res.json({ message: 'تم البيع بنجاح', invoice: invoiceNumber });
              });
              return;
            }
            const pid = productIds[i];
            const qty = merged[pid];
            const p = byId[pid];
            const total = p.price * qty;
            db.run(
              'INSERT INTO sales (product_id,quantity,total,invoice_number,user_id) VALUES (?,?,?,?,?)',
              [pid, qty, total, invoiceNumber, userId],
              function (insertErr) {
                if (insertErr) {
                  return db.run('ROLLBACK', () => res.status(500).json({ error: 'فشل البيع' }));
                }
                db.run(
                  'UPDATE products SET stock = stock - ? WHERE id=?',
                  [qty, pid],
                  function (updErr) {
                    if (updErr) {
                      return db.run('ROLLBACK', () => res.status(500).json({ error: 'فشل تحديث المخزون' }));
                    }
                    step(i + 1);
                  }
                );
              }
            );
          }
          step(0);
        });
      });
    }
  );
});

/* =========================
   إحصائيات المبيعات
========================= */
app.get('/sales/today', requireLogin, requireCashier, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const sql = "SELECT IFNULL(SUM(total),0) totalRevenue, IFNULL(SUM(quantity),0) totalItems FROM sales WHERE DATE(created_at)=?";
  db.get(sql, [today], (err, summary) => {
    if (err) return res.status(500).json(err);
    const topSql = "SELECT p.name,SUM(s.quantity) qty FROM sales s JOIN products p ON p.id=s.product_id WHERE DATE(s.created_at)=? GROUP BY s.product_id ORDER BY qty DESC LIMIT 1";
    db.get(topSql, [today], (err, top) => {
      res.json({ totalRevenue: summary.totalRevenue, totalItems: summary.totalItems, topProduct: top ? top.name : "-" });
    });
  });
});

app.get('/sales/history', requireLogin, requireCashier, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 50;
  const offset = (page - 1) * limit;
  const sql = `
    SELECT s.invoice_number, p.name product, s.quantity, s.total,
    p.cost_price, (s.total-(p.cost_price*s.quantity)) as profit, s.created_at
    FROM sales s JOIN products p ON p.id=s.product_id
    ORDER BY s.created_at DESC LIMIT ? OFFSET ?
  `;
  db.all(sql, [limit, offset], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

app.get('/sales/week', requireLogin, requireCashier, (req, res) => {
  const sql = "SELECT IFNULL(SUM(total),0) revenue, IFNULL(SUM(quantity),0) items FROM sales WHERE date(created_at)>=date('now','-7 days')";
  db.get(sql, [], (err, row) => {
    if (err) return res.status(500).json(err);
    res.json(row);
  });
});

app.get('/sales/month', requireLogin, requireCashier, (req, res) => {
  const sql = "SELECT IFNULL(SUM(total),0) revenue, IFNULL(SUM(quantity),0) items FROM sales WHERE strftime('%Y-%m',created_at)=strftime('%Y-%m','now')";
  db.get(sql, [], (err, row) => {
    if (err) return res.status(500).json(err);
    res.json(row);
  });
});

app.get('/sales/week-invoices', requireLogin, requireCashier, (req, res) => {
  const sql = "SELECT invoice_number, SUM(total) as total, MAX(created_at) as created_at FROM sales WHERE date(created_at) >= date('now','-7 days') GROUP BY invoice_number ORDER BY invoice_number DESC";
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json(rows);
  });
});

app.get('/sales/month-invoices', requireLogin, requireCashier, (req, res) => {
  const sql = "SELECT invoice_number, SUM(total) as total, MAX(created_at) as created_at FROM sales WHERE strftime('%Y-%m', created_at)=strftime('%Y-%m','now') GROUP BY invoice_number ORDER BY invoice_number DESC";
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json(rows);
  });
});

app.get('/sales/invoices', requireLogin, requireCashier, (req, res) => {
  const sql = "SELECT invoice_number, SUM(total) as total, MAX(created_at) as created_at FROM sales GROUP BY invoice_number ORDER BY invoice_number DESC";
  db.all(sql, [], (err, rows) => {
    if (err) { res.status(500).json({ error: "db error" }); return; }
    res.json(rows);
  });
});

app.get('/sales/invoice/:number', requireLogin, (req, res) => {
  const invoiceNumber = req.params.number;
  const sql = "SELECT s.invoice_number, s.quantity, s.total, s.created_at, p.name FROM sales s JOIN products p ON p.id = s.product_id WHERE s.invoice_number = ?";
  db.all(sql, [invoiceNumber], (err, rows) => {
    if (err) return res.status(500).json({ error: "database error" });
    if (!rows.length) return res.json(null);
    res.json({ invoice_number: invoiceNumber, date: rows[0].created_at, items: rows });
  });
});

app.delete('/sales/history/clear', requireLogin, requireAdmin, (req, res) => {
  const option = req.query.option;
  let sql = "";
  if (option === "month") {
    sql = "DELETE FROM sales WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m','now')";
  } else if (option === "all") {
    sql = "DELETE FROM sales";
  } else {
    return res.status(400).json({ error: "خيار غير صحيح" });
  }
  db.run(sql, [], function(err) {
    if (err) return res.status(500).json({ error: "فشل في مسح السجلات" });
    logAction(req.session.user.id, req.session.user.username, 'مسح سجلات', option);
    res.json({ message: "تم مسح السجلات بنجاح" });
  });
});

/* =========================
   المنتجات
========================= */
app.get('/products/top', requireLogin, requireCashier, (req, res) => {
  const sql = "SELECT p.name,SUM(s.quantity) qty FROM sales s JOIN products p ON p.id=s.product_id GROUP BY s.product_id ORDER BY qty DESC LIMIT 5";
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

app.get('/products/low-stock', requireLogin, requireCashier, (req, res) => {
  db.all("SELECT * FROM products WHERE stock<=5", [], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows);
  });
});

/* =========================
   الأرباح
========================= */
app.get('/profits/today', requireLogin, requireCashier, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const sql = "SELECT IFNULL(SUM((s.total)-(p.cost_price*s.quantity)),0) profit FROM sales s JOIN products p ON p.id=s.product_id WHERE DATE(s.created_at)=?";
  db.get(sql, [today], (err, row) => {
    if (err) return res.status(500).json(err);
    res.json({ profit: row.profit });
  });
});

app.get('/profits/month', requireLogin, requireCashier, (req, res) => {
  const sql = "SELECT IFNULL(SUM(s.total - (p.cost_price * s.quantity)), 0) as profit FROM sales s JOIN products p ON p.id = s.product_id WHERE strftime('%Y-%m', s.created_at) = strftime('%Y-%m', 'now')";
  db.get(sql, [], (err, row) => {
    if (err) return res.status(500).json(err);
    res.json({ profit: row.profit || 0 });
  });
});

/* =========================
   الموردين
========================= */
app.get('/suppliers', requireLogin, requireCashier, (req, res) => {
  db.all("SELECT id, name, phone, address, created_at FROM suppliers ORDER BY name ASC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'db error', message: 'db error' });
    res.json(rows);
  });
});

app.post('/suppliers', requireLogin, requireCashier, (req, res) => {
  const name = (req.body.name || '').trim();
  const phone = (req.body.phone || '').trim();
  const address = (req.body.address || '').trim();
  if (!name) return res.status(400).json({ error: 'بيانات ناقصة', message: 'بيانات ناقصة' });

  db.run(
    "INSERT INTO suppliers (name, phone, address) VALUES (?,?,?)",
    [name, phone || null, address || null],
    function (err) {
      if (err) return res.status(500).json({ error: 'Insert failed', message: 'فشل إضافة المورد (قد يكون الاسم موجود)' });
      logAction(req.session.user.id, req.session.user.username, 'إضافة مورد', name);
      res.json({ message: 'تمت الإضافة', supplierId: this.lastID });
    }
  );
});

app.get('/suppliers/:supplierId/summary', requireLogin, requireCashier, (req, res) => {
  const supplierId = parseInt(req.params.supplierId, 10);
  if (!supplierId) return res.status(400).json({ error: 'invalid', message: 'invalid' });

  const purchasesSql = "SELECT IFNULL(SUM(total),0) totalPurchases FROM supplier_purchases WHERE supplier_id=?";
  const paymentsSql = "SELECT IFNULL(SUM(amount),0) totalPaid FROM supplier_payments WHERE supplier_id=?";
  db.get(purchasesSql, [supplierId], (err, pRow) => {
    if (err) return res.status(500).json({ error: 'db error', message: 'db error' });
    db.get(paymentsSql, [supplierId], (err2, payRow) => {
      if (err2) return res.status(500).json({ error: 'db error', message: 'db error' });
      const totalPurchases = pRow?.totalPurchases || 0;
      const totalPaid = payRow?.totalPaid || 0;
      res.json({ totalPurchases, totalPaid, remaining: totalPurchases - totalPaid });
    });
  });
});

app.get('/suppliers/:supplierId/purchases', requireLogin, requireCashier, (req, res) => {
  const supplierId = parseInt(req.params.supplierId, 10);
  if (!supplierId) return res.status(400).json({ error: 'invalid', message: 'invalid' });
  db.all(
    "SELECT id, supplier_id, invoice_number, invoice_date, total, notes, created_at FROM supplier_purchases WHERE supplier_id=? ORDER BY created_at DESC",
    [supplierId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'db error', message: 'db error' });
      res.json(rows);
    }
  );
});

app.get('/suppliers/purchases', requireLogin, requireCashier, (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200)
  const offset = (page - 1) * limit
  const q = (req.query.q || '').trim()

  const where = []
  const params = []
  if (q) {
    where.push('(s.name LIKE ? OR p.invoice_number LIKE ?)')
    params.push(`%${q}%`, `%${q}%`)
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const countSql = `
    SELECT COUNT(1) as totalCount
    FROM supplier_purchases p
    JOIN suppliers s ON s.id = p.supplier_id
    ${whereSql}
  `
  const dataSql = `
    SELECT p.id, p.supplier_id, s.name supplier_name, p.invoice_number, p.invoice_date, p.total, p.notes, p.created_at
    FROM supplier_purchases p
    JOIN suppliers s ON s.id = p.supplier_id
    ${whereSql}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `

  db.get(countSql, params, (err, cRow) => {
    if (err) return res.status(500).json({ error: 'db error', message: 'db error' })
    const totalCount = cRow?.totalCount || 0
    db.all(dataSql, [...params, limit, offset], (err2, rows) => {
      if (err2) return res.status(500).json({ error: 'db error', message: 'db error' })
      res.json({ page, limit, totalCount, rows })
    })
  })
})

app.get('/suppliers/purchases/:purchaseId', requireLogin, requireCashier, (req, res) => {
  const purchaseId = parseInt(req.params.purchaseId, 10);
  if (!purchaseId) return res.status(400).json({ error: 'invalid', message: 'invalid' });

  const headSql = "SELECT p.*, s.name supplier_name FROM supplier_purchases p JOIN suppliers s ON s.id=p.supplier_id WHERE p.id=?";
  const itemsSql = `
    SELECT i.id, i.product_id, pr.name product_name, i.quantity, i.unit_cost, i.total
    FROM supplier_purchase_items i
    JOIN products pr ON pr.id=i.product_id
    WHERE i.purchase_id=?
    ORDER BY i.id ASC
  `;
  db.get(headSql, [purchaseId], (err, head) => {
    if (err) return res.status(500).json({ error: 'db error', message: 'db error' });
    if (!head) return res.json(null);
    db.all(itemsSql, [purchaseId], (err2, items) => {
      if (err2) return res.status(500).json({ error: 'db error', message: 'db error' });
      res.json({ purchase: head, items });
    });
  });
});

app.post('/suppliers/purchases', requireLogin, requireCashier, (req, res) => {
  const supplierId = parseInt(req.body.supplier_id, 10);
  const invoiceNumber = (req.body.invoice_number || '').trim();
  const invoiceDate = (req.body.invoice_date || '').trim();
  const notes = (req.body.notes || '').trim();
  const items = req.body.items;

  if (!supplierId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'بيانات ناقصة', message: 'بيانات ناقصة' });
  }

  const merged = {};
  for (const row of items) {
    const pid = parseInt(row.product_id, 10);
    const qty = parseInt(row.quantity, 10);
    const unitCost = parseFloat(row.unit_cost);
    if (!pid || !qty || qty < 1 || !Number.isFinite(unitCost) || unitCost < 0) {
      return res.status(400).json({ error: 'بيانات ناقصة', message: 'بيانات ناقصة' });
    }
    if (!merged[pid]) merged[pid] = { product_id: pid, quantity: 0, unit_cost: unitCost };
    merged[pid].quantity += qty;
    merged[pid].unit_cost = unitCost;
  }
  const mergedItems = Object.values(merged);

  const productIds = mergedItems.map((x) => x.product_id);
  const placeholders = productIds.map(() => '?').join(',');
  db.all(`SELECT id, name FROM products WHERE id IN (${placeholders})`, productIds, (err, prows) => {
    if (err) return res.status(500).json({ error: 'db error', message: 'db error' });
    if (!prows || prows.length !== productIds.length) return res.status(404).json({ error: 'منتج غير موجود', message: 'منتج غير موجود' });

    let total = 0;
    mergedItems.forEach((it) => { total += it.quantity * it.unit_cost; });

    db.run('BEGIN IMMEDIATE TRANSACTION', (beginErr) => {
      if (beginErr) return res.status(500).json({ error: 'فشل بدء المعاملة', message: 'فشل بدء المعاملة' });

      db.run(
        "INSERT INTO supplier_purchases (supplier_id, invoice_number, invoice_date, total, notes) VALUES (?,?,?,?,?)",
        [supplierId, invoiceNumber || null, invoiceDate || null, total, notes || null],
        function (headErr) {
          if (headErr) {
            return db.run('ROLLBACK', () => res.status(500).json({ error: 'فشل إضافة الفاتورة', message: 'فشل إضافة الفاتورة' }));
          }
          const purchaseId = this.lastID;

          function step(i) {
            if (i >= mergedItems.length) {
              return db.run('COMMIT', (commitErr) => {
                if (commitErr) {
                  return res.status(500).json({ error: 'فشل حفظ الفاتورة', message: 'فشل حفظ الفاتورة' });
                }
                logAction(req.session.user.id, req.session.user.username, 'فاتورة مورد', `supplier:${supplierId} purchase:${purchaseId} total:${total}`);
                res.json({ message: 'تم حفظ الفاتورة', purchaseId, total });
              });
            }
            const it = mergedItems[i];
            const lineTotal = it.quantity * it.unit_cost;
            db.run(
              "INSERT INTO supplier_purchase_items (purchase_id, product_id, quantity, unit_cost, total) VALUES (?,?,?,?,?)",
              [purchaseId, it.product_id, it.quantity, it.unit_cost, lineTotal],
              function (lineErr) {
                if (lineErr) {
                  return db.run('ROLLBACK', () => res.status(500).json({ error: 'فشل حفظ البنود', message: 'فشل حفظ البنود' }));
                }
                db.run(
                  "UPDATE products SET stock = stock + ? WHERE id=?",
                  [it.quantity, it.product_id],
                  function (updErr) {
                    if (updErr) {
                      return db.run('ROLLBACK', () => res.status(500).json({ error: 'فشل تحديث المخزون', message: 'فشل تحديث المخزون' }));
                    }
                    step(i + 1);
                  }
                );
              }
            );
          }
          step(0);
        }
      );
    });
  });
});

app.post('/suppliers/payments', requireLogin, requireCashier, (req, res) => {
  const supplierId = parseInt(req.body.supplier_id, 10);
  const purchaseId = req.body.purchase_id != null && req.body.purchase_id !== '' ? parseInt(req.body.purchase_id, 10) : null;
  const amount = parseFloat(req.body.amount);
  const method = (req.body.method || '').trim();
  const notes = (req.body.notes || '').trim();
  const paidAt = (req.body.paid_at || '').trim();

  if (!supplierId || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: 'بيانات ناقصة', message: 'بيانات ناقصة' });
  }

  db.run(
    "INSERT INTO supplier_payments (supplier_id, purchase_id, amount, method, notes, paid_at) VALUES (?,?,?,?,?,?)",
    [supplierId, purchaseId, amount, method || null, notes || null, paidAt || null],
    function (err) {
      if (err) return res.status(500).json({ error: 'Insert failed', message: 'فشل تسجيل الدفعة' });
      logAction(req.session.user.id, req.session.user.username, 'دفعة مورد', `supplier:${supplierId} amount:${amount}`);
      res.json({ message: 'تم تسجيل الدفعة', paymentId: this.lastID });
    }
  );
});

app.get('/suppliers/:supplierId/payments', requireLogin, requireCashier, (req, res) => {
  const supplierId = parseInt(req.params.supplierId, 10)
  if (!supplierId) return res.status(400).json({ error: 'invalid', message: 'invalid' })

  const sql = `
    SELECT pay.id, pay.supplier_id, s.name supplier_name, pay.purchase_id,
           p.invoice_number, p.invoice_date,
           pay.amount, pay.method, pay.notes, pay.paid_at, pay.created_at
    FROM supplier_payments pay
    JOIN suppliers s ON s.id = pay.supplier_id
    LEFT JOIN supplier_purchases p ON p.id = pay.purchase_id
    WHERE pay.supplier_id = ?
    ORDER BY pay.paid_at DESC, pay.id DESC
  `
  db.all(sql, [supplierId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'db error', message: 'db error' })
    res.json(rows)
  })
})

app.get('/suppliers/export-data', requireLogin, requireCashier, (req, res) => {
  const suppliersSql = `
    SELECT s.id, s.name, s.phone, s.address, s.created_at,
      IFNULL((SELECT SUM(total) FROM supplier_purchases p WHERE p.supplier_id=s.id),0) AS totalPurchases,
      IFNULL((SELECT SUM(amount) FROM supplier_payments pay WHERE pay.supplier_id=s.id),0) AS totalPaid,
      IFNULL((SELECT SUM(total) FROM supplier_purchases p WHERE p.supplier_id=s.id),0) -
      IFNULL((SELECT SUM(amount) FROM supplier_payments pay WHERE pay.supplier_id=s.id),0) AS remaining
    FROM suppliers s
    ORDER BY s.name ASC
  `;
  db.all(suppliersSql, [], (err, suppliers) => {
    if (err) return res.status(500).json({ error: 'db error', message: 'db error' });

    db.all("SELECT * FROM supplier_purchases ORDER BY created_at DESC", [], (err2, purchases) => {
      if (err2) return res.status(500).json({ error: 'db error', message: 'db error' });

      db.all(
        `SELECT i.*, pr.name product_name
         FROM supplier_purchase_items i
         LEFT JOIN products pr ON pr.id=i.product_id
         ORDER BY i.id ASC`,
        [],
        (err3, items) => {
          if (err3) return res.status(500).json({ error: 'db error', message: 'db error' });

          db.all("SELECT * FROM supplier_payments ORDER BY paid_at DESC, id DESC", [], (err4, payments) => {
            if (err4) return res.status(500).json({ error: 'db error', message: 'db error' });
            res.json({ suppliers, purchases, items, payments });
          });
        }
      );
    });
  });
});

/* =========================
   Developer Routes
========================= */
app.get('/developer/users', requireDeveloper, (req, res) => {
  db.all("SELECT id, username, role FROM users", [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json(rows);
  });
});

app.post('/developer/users', requireDeveloper, async (req, res) => {
  const { username, password, role } = req.body;
  const hash = await bcrypt.hash(password, 10);
  db.run("INSERT INTO users (username, password, role) VALUES (?,?,?)", [username, hash, role], function(err) {
    if (err) return res.status(500).json({ error: 'اسم المستخدم موجود مسبقاً' });
    logAction(req.session.user.id, req.session.user.username, 'إضافة مستخدم', username + ' - ' + role);
    res.json({ message: 'تم الإضافة' });
  });
});

app.delete('/developer/users/:id', requireDeveloper, (req, res) => {
  db.run("DELETE FROM users WHERE id=? AND role != 'developer'", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'فشل الحذف' });
    logAction(req.session.user.id, req.session.user.username, 'حذف مستخدم', 'id: ' + req.params.id);
    res.json({ message: 'تم الحذف' });
  });
});

app.put('/developer/users/:id/password', requireDeveloper, async (req, res) => {
  const hash = await bcrypt.hash(req.body.password, 10);
  db.run("UPDATE users SET password=? WHERE id=?", [hash, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'فشل التغيير' });
    logAction(req.session.user.id, req.session.user.username, 'تغيير باسورد', 'id: ' + req.params.id);
    res.json({ message: 'تم التغيير' });
  });
});

app.get('/developer/backups', requireDeveloper, (req, res) => {
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) return res.json([]);
  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.db')).sort().reverse();
  res.json(files);
});

app.post('/developer/backup-now', requireDeveloper, (req, res) => {
  const date = new Date().toISOString().slice(0, 10);
  const time = new Date().toTimeString().slice(0, 8).replace(/:/g, '-');
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
  const backupFile = path.join(backupDir, 'birdshop-' + date + '-' + time + '.db');
  fs.copyFileSync(DB_FILE, backupFile);
  logAction(req.session.user.id, req.session.user.username, 'نسخ احتياطي يدوي', path.basename(backupFile));
  res.json({ message: 'تم النسخ' });
});

app.post('/developer/restore', requireDeveloper, (req, res) => {
  const { filename } = req.body;
  const backupDir = path.join(__dirname, 'backups');
  const backupFile = path.join(backupDir, filename);
  if (!fs.existsSync(backupFile)) return res.status(404).json({ error: 'الملف غير موجود' });
  // نسخة احتياطية قبل الاسترجاع
  const safetyBackup = path.join(backupDir, 'before-restore-' + new Date().toISOString().slice(0, 10) + '.db');
  fs.copyFileSync(DB_FILE, safetyBackup);
  fs.copyFileSync(backupFile, DB_FILE);
  logAction(req.session.user.id, req.session.user.username, 'استرجاع نسخة', filename);
  res.json({ message: '✅ تم الاسترجاع بنجاح — أعد تشغيل السيرفر' });
});

app.get('/developer/dbsize', requireDeveloper, (req, res) => {
  const stats = fs.statSync(DB_FILE);
  const kb = (stats.size / 1024).toFixed(1);
  const mb = (stats.size / 1024 / 1024).toFixed(2);
  res.json({ size: mb > 1 ? mb + ' MB' : kb + ' KB' });
});

app.post('/developer/restart', requireDeveloper, (req, res) => {
  res.json({ message: 'جاري إعادة التشغيل...' })
  setTimeout(() => process.exit(0), 500)
}) 

app.get('/developer/logs', requireDeveloper, (req, res) => {
  db.all("SELECT * FROM logs ORDER BY created_at DESC LIMIT 200", [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json(rows);
  });
});

app.get('/developer/stats', requireDeveloper, (req, res) => {
  db.all(`
    SELECT u.username, COUNT(s.id) as sales_count, SUM(s.total) as total
    FROM sales s
    LEFT JOIN users u ON u.id = s.user_id
    GROUP BY s.user_id
    ORDER BY total DESC
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json(rows);
  });
});


/* =========================
   تشغيل السيرفر
========================= */
app.listen(3000, () => {
  console.log("✅ Server running on http://localhost:3000");
});

/* =========================
   Cron Jobs
========================= */


// نسخ احتياطي محلي كل يوم الساعة 11 مساءً
cron.schedule('0 20 * * *', () => {
  const date = new Date().toISOString().slice(0, 10);
  const backupDir = path.join(__dirname, 'backups');
  const backupFile = path.join(backupDir, 'birdshop-' + date + '.db');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
  fs.copyFileSync(DB_FILE, backupFile);
  console.log("✅ تم النسخ المحلي: " + backupFile);
  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.db') && !f.startsWith('weekly-') && !f.startsWith('before-')).sort();
  if (files.length > 30) {
    files.slice(0, files.length - 30).forEach(f => {
      fs.unlinkSync(path.join(backupDir, f));
    });
  }
}, { timezone: "Asia/Qatar" });

// نسخ أسبوعي كل جمعة الساعة 11:30 مساءً
cron.schedule('30 23 * * 5', () => {
  const date = new Date().toISOString().slice(0, 10);
  const weeklyDir = path.join(__dirname, 'backups', 'weekly');
  if (!fs.existsSync(weeklyDir)) fs.mkdirSync(weeklyDir, { recursive: true });
  const backupFile = path.join(weeklyDir, 'weekly-' + date + '.db');
  fs.copyFileSync(DB_FILE, backupFile);
  console.log('✅ تم النسخ الأسبوعي: ' + backupFile);
  const files = fs.readdirSync(weeklyDir).filter(f => f.endsWith('.db')).sort();
  if (files.length > 12) {
    files.slice(0, files.length - 12).forEach(f => {
      fs.unlinkSync(path.join(weeklyDir, f));
    });
  }
}, { timezone: "Asia/Qatar" });




