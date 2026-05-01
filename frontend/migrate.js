const db = require('./database');

// إضافة عمود cost_price في جدول المنتجات
db.run("ALTER TABLE products ADD COLUMN cost_price REAL DEFAULT 0", (err) => {
  if (err) {
    console.log("عمود cost_price موجود مسبقاً في products أو حدث خطأ:", err.message);
  } else {
    console.log("✅ تمت إضافة عمود cost_price إلى جدول products");
  }
});

// إضافة عمود cost_price في جدول المبيعات
db.run("ALTER TABLE sales ADD COLUMN cost_price REAL DEFAULT 0", (err) => {
  if (err) {
    console.log("عمود cost_price موجود مسبقاً في sales أو حدث خطأ:", err.message);
  } else {
    console.log("✅ تمت إضافة عمود cost_price إلى جدول sales");
  }
});

// اغلاق قاعدة البيانات بعد التعديلات
db.close(() => {
  console.log("✅ انتهت التعديلات على قاعدة البيانات");
});