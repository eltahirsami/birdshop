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

// Generates a base64 license key encoding machineId + expiry + HMAC signature
function generateLicenseKey(machineId, expiry) {
  const sig = crypto.createHmac('sha256', SECRET)
    .update(machineId + '|' + expiry)
    .digest('hex')
    .slice(0, 32)
  const payload = JSON.stringify({ machineId, expiry, sig })
  return Buffer.from(payload).toString('base64')
}

function getLicenseStatus() {
  try {
    if (!fs.existsSync(LICENSE_FILE)) {
      return { valid: false, reason: 'not_licensed', daysRemaining: null, expiry: null }
    }
    const raw = fs.readFileSync(LICENSE_FILE, 'utf8').trim()
    let parsed
    try {
      parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'))
    } catch {
      return { valid: false, reason: 'not_licensed', daysRemaining: null, expiry: null }
    }

    const { machineId, expiry, sig } = parsed
    if (!machineId || !expiry || !sig) {
      return { valid: false, reason: 'not_licensed', daysRemaining: null, expiry: null }
    }

    // Verify HMAC signature
    const expectedSig = crypto.createHmac('sha256', SECRET)
      .update(machineId + '|' + expiry)
      .digest('hex')
      .slice(0, 32)
    if (sig !== expectedSig) {
      return { valid: false, reason: 'not_licensed', daysRemaining: null, expiry: null }
    }

    // Check machine ID matches this machine
    if (machineId !== getMachineId()) {
      return { valid: false, reason: 'machine_mismatch', daysRemaining: null, expiry }
    }

    // Check expiry
    const expiryDate = new Date(expiry + 'T23:59:59')
    const daysRemaining = Math.ceil((expiryDate - new Date()) / (24 * 60 * 60 * 1000))
    if (daysRemaining < 0) {
      return { valid: false, reason: 'expired', daysRemaining: 0, expiry }
    }

    return { valid: true, reason: 'active', daysRemaining, expiry }
  } catch {
    return { valid: false, reason: 'not_licensed', daysRemaining: null, expiry: null }
  }
}

function isLicensed() {
  return getLicenseStatus().valid
}

function saveLicense(key) {
  fs.writeFileSync(LICENSE_FILE, key.trim())
}

module.exports = { getMachineId, generateLicenseKey, getLicenseStatus, isLicensed, saveLicense }
