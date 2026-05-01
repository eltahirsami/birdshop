const bcrypt = require('bcrypt');
const db = require('./database');

(async () => {
  try {
    const username = 'cashier';
    const password = '1234';
    const role = 'cashier';

    const hash = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hash, role],
      function (err) {
        if (err) {
          console.error('❌ Error:', err.message);
        } else {
          console.log('✅ Cashier user created successfully');
        }
        process.exit();
      }
    );
  } catch (e) {
    console.error(e);
    process.exit();
  }
})();