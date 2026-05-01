const { Client, LocalAuth } = require('whatsapp-web.js')
const qrcode = require('qrcode-terminal')
const db = require('./database')

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
})

// عرض QR للمسح أول مرة
client.on('qr', (qr) => {
  console.log('امسح هذا الـ QR بواتساب:')
  qrcode.generate(qr, { small: true })
})

client.on('ready', () => {
  console.log('✅ واتساب متصل')
})

client.on('auth_failure', () => {
  console.log('❌ فشل تسجيل الدخول لواتساب')
})

// دالة إرسال التقرير
async function sendDailyReport() {
  return new Promise((resolve, reject) => {
    const today = new Date().toISOString().slice(0, 10)

    // جلب أرباح اليوم
    const profitSql = `
      SELECT IFNULL(SUM(s.total - (p.cost_price * s.quantity)), 0) as profit
      FROM sales s
      JOIN products p ON p.id = s.product_id
      WHERE DATE(s.created_at) = ?
    `

    // جلب إحصائيات اليوم
    const statsSql = `
      SELECT
        IFNULL(SUM(total), 0) as totalRevenue,
        IFNULL(SUM(quantity), 0) as totalItems
      FROM sales
      WHERE DATE(created_at) = ?
    `

    // جلب الأكثر مبيعًا
    const topSql = `
      SELECT p.name, SUM(s.quantity) qty
      FROM sales s
      JOIN products p ON p.id = s.product_id
      WHERE DATE(s.created_at) = ?
      GROUP BY s.product_id
      ORDER BY qty DESC
      LIMIT 1
    `

    db.get(profitSql, [today], (err, profitRow) => {
      if (err) return reject(err)

      db.get(statsSql, [today], (err, statsRow) => {
        if (err) return reject(err)

        db.get(topSql, [today], async (err, topRow) => {
          if (err) return reject(err)

          const dateStr = new Date().toLocaleDateString('ar', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })

          const message =
            "🦜 تقرير محل الطيور\n" +
            "📅 " + dateStr + "\n\n" +
            "━━━━━━━━━━━━━━━━━━\n" +
            "💰 أرباح اليوم: " + profitRow.profit + "\n" +
            "🛒 مبيعات اليوم: " + statsRow.totalRevenue + "\n" +
            "📦 عدد القطع المباعة: " + statsRow.totalItems + "\n" +
            "🔥 الأكثر مبيعًا: " + (topRow ? topRow.name : "-") + "\n" +
            "━━━━━━━━━━━━━━━━━━"

          try {
            // ضع رقم واتساب هنا بالصيغة الدولية بدون + أو صفر
            // مثال: 9665xxxxxxxx للسعودية
            const number = "55951951@c.us"
            await client.sendMessage(number, message)
            console.log("✅ تم إرسال التقرير")
            resolve()
          } catch (e) {
            console.error("❌ فشل الإرسال:", e)
            reject(e)
          }
        })
      })
    })
  })
}

try {
  client.initialize()
} catch(e) {
  console.log('WhatsApp disabled:', e.message)
}

module.exports = { sendDailyReport }