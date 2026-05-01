require('dotenv').config({ path: require('path').join(__dirname, '.env') })
const { generateLicenseKey } = require('./license')
const machineId = process.argv[2]
if (!machineId) {
  console.log('الاستخدام: node generate-license.js MACHINEID')
  process.exit()
}
const key = generateLicenseKey(machineId)
console.log('Machine ID:', machineId)
console.log('License Key:', key)