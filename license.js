const { machineIdSync } = require('node-machine-id')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '.env') })

const LICENSE_FILE = path.join(__dirname, 'license.dat')
const SECRET = process.env.LICENSE_SECRET || 'SKYBIRD2026SECRET'

function getMachineId() {
  return machineIdSync(true).slice(0, 16).toUpperCase()
}

function generateLicenseKey(machineId) {
  const hash = crypto.createHmac('sha256', SECRET)
    .update(machineId)
    .digest('hex')
    .slice(0, 24)
    .toUpperCase()
  return hash.match(/.{1,6}/g).join('-')
}

function isLicensed() {
  try {
    if (!fs.existsSync(LICENSE_FILE)) return false
    const saved = fs.readFileSync(LICENSE_FILE, 'utf8').trim()
    const machineId = getMachineId()
    const validKey = generateLicenseKey(machineId)
    return saved === validKey
  } catch {
    return false
  }
}

function saveLicense(key) {
  fs.writeFileSync(LICENSE_FILE, key.trim())
}

module.exports = { getMachineId, generateLicenseKey, isLicensed, saveLicense }