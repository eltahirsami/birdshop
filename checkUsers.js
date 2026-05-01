const db = require('./database');

db.all(
  'SELECT id, username, role FROM users',
  [],
  (err, rows) => {
    if (err) {
      console.error('❌ Error:', err.message);
    } else {
      console.log('👥 Users in database:');
      console.table(rows);
    }
    process.exit();
  }
);