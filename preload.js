const { contextBridge, ipcRenderer } = require("electron");

// Exposition sécurisée des APIs
contextBridge.exposeInMainWorld("api", {
  // Commandes PHP
  runCommand: (args, customPath = null) =>
    ipcRenderer.invoke("run-command", args, customPath),

  // Vérification de PHP
  checkPhp: () => ipcRenderer.invoke("check-php"),

  // Dialogues
  showErrorDialog: (title, content) =>
    ipcRenderer.invoke("show-error-dialog", title, content),
  showInfoDialog: (title, content) =>
    ipcRenderer.invoke("show-info-dialog", title, content),

  // Sélection de fichiers
  selectPhpIni: () => ipcRenderer.invoke("select-php-ini"),

  // Informations de l'application
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),

  // Événements
  onPhpIniSelected: (callback) => {
    ipcRenderer.on("php-ini-selected", (event, filePath) => callback(filePath));
  },

  // Nettoyage des listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
});

// Exposition d'APIs utilitaires
contextBridge.exposeInMainWorld("utils", {
  // Validation d'extension
  validateExtensionName: (name) => {
    const validPattern = /^[a-zA-Z0-9_-]+$/;
    return validPattern.test(name);
  },

  // Formatage de texte
  formatOutput: (text) => {
    if (!text) return "";
    return text.trim().replace(/\r\n/g, "\n");
  },

  // Détection du système
  platform: process.platform,

  // Échappement HTML
  escapeHtml: (text) => {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  },
});

// Log des erreurs pour debugging
window.addEventListener("error", (event) => {
  console.error("Erreur JavaScript:", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Promise rejetée:", event.reason);
});
