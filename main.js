const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  Menu,
  shell,
} = require("electron");
const path = require("path");
const { execFile } = require("child_process");
const fs = require("fs");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    icon: path.join(__dirname, "assets", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
    titleBarStyle: "default",
    show: false,
  });

  createMenu();

  mainWindow.loadFile("index.html");

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }
}

function createMenu() {
  const template = [
    {
      label: "Fichier",
      submenu: [
        {
          label: "Ouvrir php.ini",
          accelerator: "CmdOrCtrl+O",
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ["openFile"],
              filters: [
                { name: "Fichiers INI", extensions: ["ini"] },
                { name: "Tous les fichiers", extensions: ["*"] },
              ],
            });
            if (!result.canceled) {
              mainWindow.webContents.send(
                "php-ini-selected",
                result.filePaths[0]
              );
            }
          },
        },
        { type: "separator" },
        {
          label: "Quitter",
          accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: "Édition",
      submenu: [
        { role: "undo", label: "Annuler" },
        { role: "redo", label: "Rétablir" },
        { type: "separator" },
        { role: "cut", label: "Couper" },
        { role: "copy", label: "Copier" },
        { role: "paste", label: "Coller" },
      ],
    },
    {
      label: "Affichage",
      submenu: [
        { role: "reload", label: "Actualiser" },
        { role: "forceReload", label: "Actualiser (forcé)" },
        { role: "toggleDevTools", label: "Outils de développement" },
        { type: "separator" },
        { role: "resetZoom", label: "Zoom réel" },
        { role: "zoomIn", label: "Zoom avant" },
        { role: "zoomOut", label: "Zoom arrière" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Plein écran" },
      ],
    },
    {
      label: "Aide",
      submenu: [
        {
          label: "À propos",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "À propos de php.ini Editor",
              message: "php.ini Editor v1.0.0",
              detail:
                "Application Electron pour gérer php.ini et Xdebug\nDéveloppé par xFantooo",
            });
          },
        },
        {
          label: "Documentation",
          click: () => {
            shell.openExternal("https://github.com/xFantooo/php-ini-editor");
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

process.on("uncaughtException", (error) => {
  console.error("Erreur non capturée:", error);
  dialog.showErrorBox("Erreur critique", error.message);
});

// IPC Handlers
ipcMain.handle("run-command", async (event, args, customPath = null) => {
  return new Promise((resolve, reject) => {
    const php = process.platform === "win32" ? "php.exe" : "php";
    const script = path.resolve(__dirname, "toggle-xdebug.php"); // corrige chemin avec espaces
    const params = customPath ? [...args, `--path=${customPath}`] : args;

    const timeout = setTimeout(() => {
      reject(new Error("Timeout: La commande a pris trop de temps"));
    }, 30000);

    execFile(
      php,
      [script, ...params],
      {
        timeout: 30000,
        maxBuffer: 1024 * 1024,
      },
      (error, stdout, stderr) => {
        clearTimeout(timeout);

        if (error) {
          console.error("Erreur exec:", error);
          reject(stderr || error.message);
        } else {
          resolve(stdout);
        }
      }
    );
  });
});

ipcMain.handle("check-php", async () => {
  return new Promise((resolve) => {
    execFile("php", ["--version"], (error, stdout) => {
      if (error) {
        resolve({ available: false, error: error.message });
      } else {
        resolve({ available: true, version: stdout.split("\n")[0] });
      }
    });
  });
});

ipcMain.handle("show-error-dialog", async (event, title, content) => {
  dialog.showErrorBox(title, content);
});

ipcMain.handle("show-info-dialog", async (event, title, content) => {
  return dialog.showMessageBox(mainWindow, {
    type: "info",
    title: title,
    message: content,
    buttons: ["OK"],
  });
});

ipcMain.handle("select-php-ini", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [
      { name: "Fichiers INI", extensions: ["ini"] },
      { name: "Tous les fichiers", extensions: ["*"] },
    ],
    title: "Sélectionner le fichier php.ini",
  });

  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});
