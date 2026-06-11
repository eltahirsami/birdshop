require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const { generateLicenseKey } = require('./license')

const machineId = process.argv[2]
const expiry = process.argv[3]

if (!machineId || !expiry) {
  console.log('الاستخدام: node generate-license.js MACHINEID YYYY-MM-DD')
  console.log('مثال:    node generate-license.js ABCDEF1234567890 2026-12-31')
  process.exit(1)
}

if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
  console.log('خطأ: صيغة التاريخ يجب أن تكون YYYY-MM-DD')
  process.exit(1)
}

const key = generateLicenseKey(machineId, expiry)
console.log('Machine ID:  ', machineId)
console.log('Expiry Date: ', expiry)
console.log('License Key: ', key)
