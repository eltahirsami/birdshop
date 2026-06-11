const { app, BrowserWindow } = require('electron')
const path = require('path')
const http = require('http')
const fs = require('fs')

let mainWindow

function getLogPath() {
  return path.join(app.getPath('userData'), 'server.log')
}

function writeLog(msg) {
  try {
    fs.appendFileSync(getLogPath(), new Date().toISOString() + ' ' + msg + '\n')
  } catch (e) {}
}

function startServer() {
  const dbPath = path.join(app.getPath('userData'), 'birdshop.db')
  process.env.DB_PATH = dbPath
  process.env.PORT = '3000'
  writeLog('Starting server in-process. DB: ' + dbPath)
  try {
    require('./index.js')
    writeLog('index.js loaded successfully')
    return null
  } catch (e) {
    writeLog('index.js load error: ' + (e.stack || e.message))
    return e
  }
}

function waitForServer(onReady, onTimeout, tries) {
  tries = tries || 0
  if (tries >= 15) { onTimeout(); return }
  var req = http.get('http://localhost:3000', function() {
    writeLog('Server ready after ' + tries + ' tries')
    onReady()
  })
  req.on('error', function() {
    setTimeout(function() { waitForServer(onReady, onTimeout, tries + 1) }, 1000)
  })
  req.end()
}

function showError(msg) {
  var logPath = getLogPath()
  var logContent = ''
  try { logContent = fs.readFileSync(logPath, 'utf8').slice(-800) } catch (e) {}
  var html =
    '<html dir="rtl"><body style="font-family:Tahoma;text-align:center;padding:40px;background:#0a0e1a;color:#e0e0e0">' +
    '<h2 style="color:#ff4757">&#10060; فشل تشغيل السيرفر</h2>' +
    '<p style="color:#aaa">' + msg + '</p>' +
    '<p style="font-size:12px;color:#555;direction:ltr">' + logPath + '</p>' +
    '<pre style="font-size:11px;text-align:left;background:#111;color:#0f0;padding:12px;overflow:auto;max-height:300px;border-radius:6px;direction:ltr">' +
    logContent.replace(/</g, '&lt;') +
    '</pre>' +
    '<button onclick="location.reload()" style="margin-top:16px;padding:10px 24px;cursor:pointer;background:#1a6;color:#fff;border:none;border-radius:6px;font-size:14px">&#128260; إعادة المحاولة</button>' +
    '</body></html>'
  mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Sky Bird',
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  })
  mainWindow.webContents.setWindowOpenHandler(function() {
    return { action: 'allow', overrideBrowserWindowOptions: { width: 700, height: 700, title: 'Invoice' } }
  })
  mainWindow.loadFile(path.join(__dirname, 'loading.html'))

  var loadErr = startServer()
  if (loadErr) {
    setTimeout(function() {
      showError('خطأ في تحميل السيرفر: ' + loadErr.message)
    }, 500)
    return
  }

  waitForServer(
    function() { mainWindow.loadURL('http://localhost:3000') },
    function() { showError('لم يستجب السيرفر خلال 15 ثانية') }
  )

  mainWindow.on('closed', function() { mainWindow = null })
}

app.on('ready', function() {
  writeLog('Electron ready. execPath: ' + process.execPath)
  createWindow()
})

app.on('window-all-closed', function() { app.quit() })
