const bcrypt = require('bcrypt')
const db = require('./database')

async function createDeveloper() {
  const password = await bcrypt.hash('dev123456', 10)
  
  db.run(
    "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
    ['developer', password, 'developer'],
    function(err) {
      if (err) {
        console.log('خطأ:', err.message)
      } else {
        console.log('تم انشاء حساب المبرمج بنجاح')
        console.log('اليوزر: developer')
        console.log('الباسورد: dev123456')
      }
    }
  )
}

createDeveloper()