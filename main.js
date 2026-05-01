const { app, BrowserWindow } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const http = require('http')

let mainWindow
let serverProcess

function startServer() {
  const serverPath = path.join(__dirname, 'index.js')
  const nodeExe = process.env.NODE_EXE || 'node'
  const dbPath = path.join(app.getPath('userData'), 'birdshop.db')
  serverProcess = spawn(nodeExe, [serverPath], {
    cwd: __dirname,
    env: Object.assign({}, process.env, { PORT: 3000, DB_PATH: dbPath }),
    stdio: 'ignore',
    detached: false
  })
  serverProcess.on('error', function(err) {
    console.error('Server error:', err)
  })
}

function waitForServer(callback, tries) {
  tries = tries || 0
  if (tries > 30) return
  var req = http.get('http://localhost:3000', function() {
    callback()
  })
  req.on('error', function() {
    setTimeout(function() { waitForServer(callback, tries + 1) }, 1000)
  })
  req.end()
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: '🧾 Smart POS System',
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  })
  mainWindow.webContents.setWindowOpenHandler(function() {
    return { action: 'allow', overrideBrowserWindowOptions: { width: 700, height: 700, title: 'Invoice' } }
  })
  mainWindow.loadFile(path.join(__dirname, 'loading.html'))
  waitForServer(function() { mainWindow.loadURL('http://localhost:3000') })
  mainWindow.on('closed', function() { mainWindow = null })
}

app.on('ready', function() { startServer(); createWindow() })
app.on('window-all-closed', function() { if (serverProcess) serverProcess.kill(); app.quit() })

