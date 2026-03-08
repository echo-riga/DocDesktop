const { app, BrowserWindow } = require("electron");
require("./backend/server"); // embedded Express backend
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true, // must be true
      nodeIntegration: false, // must be false
    },
  });

  win.loadFile("frontend/index.html");
}

app.whenReady().then(createWindow);
