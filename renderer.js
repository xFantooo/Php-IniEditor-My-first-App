// État global de l'application
let appState = {
  currentPhpIniPath: null,
  extensions: {},
  isLoading: false,
  lastUpdate: null,
};

// Initialisation de l'application
document.addEventListener("DOMContentLoaded", async () => {
  await initializeApp();
  setupEventListeners();
  openTab(null, "xdebug"); // Ouvrir l'onglet Xdebug par défaut
});

async function initializeApp() {
  try {
    showLoading(true);

    // Vérifier si PHP est disponible
    const phpCheck = await window.api.checkPhp();
    if (!phpCheck.available) {
      showNotification("PHP non trouvé sur le système", "error");
      disableAllControls();
      return;
    }

    updateStatus(`PHP détecté: ${phpCheck.version}`);

    // Charger les informations initiales
    await loadInitialData();
  } catch (error) {
    console.error("Erreur d'initialisation:", error);
    showNotification("Erreur lors de l'initialisation", "error");
  } finally {
    showLoading(false);
  }
}

function setupEventListeners() {
  // Gestion de la sélection de php.ini depuis le menu
  window.api.onPhpIniSelected((filePath) => {
    appState.currentPhpIniPath = filePath;
    updateStatus(`Fichier php.ini sélectionné: ${filePath}`);
    loadInitialData();
  });

  // Auto-refresh toutes les 30 secondes pour le statut
  setInterval(async () => {
    if (document.getElementById("xdebug").style.display !== "none") {
      await getStatus();
    }
  }, 30000);
}

async function loadInitialData() {
  try {
    await getStatus();
    if (document.getElementById("extensions").style.display !== "none") {
      await loadExtensions();
    }
  } catch (error) {
    console.error("Erreur lors du chargement des données:", error);
  }
}

// Gestion des onglets
function openTab(event, name) {
  // Cacher tous les onglets
  document.querySelectorAll(".tabcontent").forEach((tab) => {
    tab.style.display = "none";
  });

  // Désactiver tous les boutons d'onglets
  document.querySelectorAll(".tablink").forEach((btn) => {
    btn.classList.remove("active");
  });

  // Afficher l'onglet sélectionné
  const selectedTab = document.getElementById(name);
  if (selectedTab) {
    selectedTab.style.display = "block";

    // Activer le bouton correspondant
    if (event && event.target) {
      event.target.classList.add("active");
    } else {
      // Si appelé programmatiquement, trouver le bon bouton
      const targetButton = document.querySelector(`[onclick*="${name}"]`);
      if (targetButton) {
        targetButton.classList.add("active");
      }
    }

    // Charger les données spécifiques à l'onglet
    if (name === "extensions") {
      loadExtensions();
    } else if (name === "phpinfo") {
      // Pré-charger phpinfo si nécessaire
    }
  }
}

// Gestion de Xdebug
async function toggleXdebug(enable) {
  try {
    showLoading(true);
    const args = enable ? ["--enable"] : ["--disable"];
    const result = await window.api.runCommand(
      args,
      appState.currentPhpIniPath
    );

    document.getElementById("xdebugOutput").textContent =
      window.utils.formatOutput(result);
    showNotification(
      `Xdebug ${enable ? "activé" : "désactivé"} avec succès`,
      "success"
    );

    // Mettre à jour le statut automatiquement
    setTimeout(getStatus, 1000);
  } catch (error) {
    console.error("Erreur toggle Xdebug:", error);
    document.getElementById("xdebugOutput").textContent = `Erreur: ${error}`;
    showNotification("Erreur lors de la modification de Xdebug", "error");
  } finally {
    showLoading(false);
  }
}

async function getStatus() {
  try {
    const result = await window.api.runCommand(
      ["--status"],
      appState.currentPhpIniPath
    );
    const output = window.utils.formatOutput(result);
    document.getElementById("xdebugOutput").textContent = output;

    // Mettre à jour l'indicateur visuel
    updateXdebugIndicator(output.includes("ACTIVÉ"));
  } catch (error) {
    console.error("Erreur status:", error);
    document.getElementById("xdebugOutput").textContent = `Erreur: ${error}`;
  }
}

function updateXdebugIndicator(isEnabled) {
  const indicator = document.getElementById("xdebugIndicator");
  if (indicator) {
    indicator.className = `status-indicator ${
      isEnabled ? "enabled" : "disabled"
    }`;
    indicator.textContent = isEnabled ? "● ACTIVÉ" : "● DÉSACTIVÉ";
  }
}

// Fonction utilitaire pour nettoyer la sortie JSON
function cleanJsonOutput(output) {
  // Supprimer les warnings PHP et autres messages non-JSON
  const lines = output.split("\n");
  let jsonStart = -1;
  let jsonEnd = -1;

  // Trouver le début du JSON (première ligne qui commence par { ou [)
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      jsonStart = i;
      break;
    }
  }

  // Trouver la fin du JSON (dernière ligne qui se termine par } ou ])
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed.endsWith("}") || trimmed.endsWith("]")) {
      jsonEnd = i;
      break;
    }
  }

  if (jsonStart !== -1 && jsonEnd !== -1) {
    return lines.slice(jsonStart, jsonEnd + 1).join("\n");
  }

  // Si pas de JSON trouvé, retourner la sortie originale
  return output;
}

// Fonction de fallback pour parser les extensions depuis du texte
function parseExtensionsFromText(output) {
  const extensions = {};
  const lines = output.split("\n");

  for (const line of lines) {
    // Ignorer les warnings et lignes vides
    if (
      line.trim() === "" ||
      line.includes("Warning:") ||
      line.includes("Notice:")
    ) {
      continue;
    }

    // Essayer de parser différents formats possibles
    // Format: "extension_name version enabled/disabled"
    const match = line.match(/^(\w+)\s+(.+?)\s+(enabled|disabled|on|off)/i);
    if (match) {
      const [, name, version, status] = match;
      extensions[name] = {
        version: version === "N/A" ? null : version,
        enabled:
          status.toLowerCase() === "enabled" || status.toLowerCase() === "on",
      };
    }
    // Format simple: "extension_name"
    else if (line.trim().match(/^\w+$/)) {
      extensions[line.trim()] = {
        version: null,
        enabled: true, // Assumé activé si listé
      };
    }
  }

  return extensions;
}

// Gestion des extensions - Version corrigée
async function loadExtensions() {
  try {
    showLoading(true);
    const result = await window.api.runCommand(
      ["--list-extensions"],
      appState.currentPhpIniPath
    );

    console.log("Sortie brute reçue:", result);

    // Nettoyer la sortie pour extraire seulement le JSON
    const cleanedResult = cleanJsonOutput(result);
    console.log("Sortie nettoyée:", cleanedResult);

    try {
      appState.extensions = JSON.parse(cleanedResult);
      console.log("Extensions parsées avec succès:", appState.extensions);
      renderExtensionsTable();
    } catch (jsonError) {
      console.error("Erreur parsing JSON:", jsonError);
      console.log("Tentative de parsing texte...");

      // Fallback: essayer de traiter comme du texte simple
      appState.extensions = parseExtensionsFromText(result);
      console.log("Extensions parsées depuis texte:", appState.extensions);
      renderExtensionsTable();
    }
  } catch (error) {
    console.error("Erreur chargement extensions:", error);
    document.getElementById("extensionsContainer").innerHTML = `
      <div class="error">
        <h3>Erreur lors du chargement des extensions</h3>
        <p>Erreur: ${error.message}</p>
        <button onclick="loadExtensions()">Réessayer</button>
      </div>
    `;
  } finally {
    showLoading(false);
  }
}

function renderExtensionsTable() {
  const container = document.getElementById("extensionsContainer");
  if (!container) return;

  // Vérifier si nous avons des extensions
  if (!appState.extensions || Object.keys(appState.extensions).length === 0) {
    container.innerHTML = `
      <div class="info">
        <p>Aucune extension trouvée ou données non disponibles.</p>
        <button onclick="loadExtensions()">Recharger</button>
      </div>
    `;
    return;
  }

  let html = `
    <div class="extensions-header">
      <input type="text" id="extensionFilter" placeholder="Filtrer les extensions..." oninput="filterExtensions()">
      <button onclick="loadExtensions()">Actualiser</button>
    </div>
    <table class="extensions-table">
      <thead>
        <tr>
          <th>Extension</th>
          <th>Version</th>
          <th>Statut</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const [name, ext] of Object.entries(appState.extensions)) {
    html += `
      <tr data-extension="${name}">
        <td>${name}</td>
        <td>${ext.version || "N/A"}</td>
        <td>
          <span class="status-badge ${ext.enabled ? "enabled" : "disabled"}">
            ${ext.enabled ? "Activé" : "Désactivé"}
          </span>
        </td>
        <td>
          <button onclick="toggleExtension('${name}', ${!ext.enabled})" 
                  class="btn-sm ${ext.enabled ? "btn-danger" : "btn-success"}">
            ${ext.enabled ? "Désactiver" : "Activer"}
          </button>
        </td>
      </tr>
    `;
  }

  html += `
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

function filterExtensions() {
  const filter = document.getElementById("extensionFilter").value.toLowerCase();
  const rows = document.querySelectorAll(".extensions-table tbody tr");

  rows.forEach((row) => {
    const extensionName = row.dataset.extension.toLowerCase();
    row.style.display = extensionName.includes(filter) ? "" : "none";
  });
}

async function toggleExtension(extName, enable) {
  try {
    showLoading(true);
    const action = enable ? "--enable-ext" : "--disable-ext";
    const result = await window.api.runCommand(
      [`${action}=${extName}`],
      appState.currentPhpIniPath
    );

    showNotification(
      `Extension ${extName} ${enable ? "activée" : "désactivée"}`,
      "success"
    );

    // Recharger les extensions
    await loadExtensions();
  } catch (error) {
    console.error("Erreur toggle extension:", error);
    showNotification(
      `Erreur lors de la modification de l'extension ${extName}`,
      "error"
    );
  } finally {
    showLoading(false);
  }
}

// Gestion des extensions (méthode alternative)
async function enableExt() {
  const extName = document.getElementById("extName").value.trim();
  if (!extName) {
    showNotification("Veuillez saisir le nom de l'extension", "warning");
    return;
  }

  if (!window.utils.validateExtensionName(extName)) {
    showNotification("Nom d'extension invalide", "error");
    return;
  }

  try {
    const result = await window.api.runCommand(
      ["--set", `extension=${extName}`],
      appState.currentPhpIniPath
    );
    document.getElementById("extOutput").textContent =
      window.utils.formatOutput(result);
    showNotification(`Extension ${extName} activée`, "success");
  } catch (error) {
    document.getElementById("extOutput").textContent = `Erreur: ${error}`;
    showNotification("Erreur lors de l'activation", "error");
  }
}

async function disableExt() {
  const extName = document.getElementById("extName").value.trim();
  if (!extName) {
    showNotification("Veuillez saisir le nom de l'extension", "warning");
    return;
  }

  try {
    const result = await window.api.runCommand(
      ["--set", `;extension=${extName}`],
      appState.currentPhpIniPath
    );
    document.getElementById("extOutput").textContent =
      window.utils.formatOutput(result);
    showNotification(`Extension ${extName} désactivée`, "success");
  } catch (error) {
    document.getElementById("extOutput").textContent = `Erreur: ${error}`;
    showNotification("Erreur lors de la désactivation", "error");
  }
}

async function listExt() {
  try {
    const result = await window.api.runCommand(
      ["--list"],
      appState.currentPhpIniPath
    );
    document.getElementById("extOutput").textContent =
      window.utils.formatOutput(result);
  } catch (error) {
    document.getElementById("extOutput").textContent = `Erreur: ${error}`;
  }
}

// Gestion de la configuration
async function applyConfig() {
  try {
    showLoading(true);
    const configs = [
      {
        key: "memory_limit",
        value: document.getElementById("memory_limit").value,
      },
      {
        key: "max_execution_time",
        value: document.getElementById("max_execution_time").value,
      },
      {
        key: "upload_max_filesize",
        value: document.getElementById("upload_max_filesize").value,
      },
      {
        key: "post_max_size",
        value: document.getElementById("post_max_size").value,
      },
    ];

    let results = [];
    for (const config of configs) {
      if (config.value.trim()) {
        try {
          const result = await window.api.runCommand(
            ["--set", `${config.key}=${config.value}`],
            appState.currentPhpIniPath
          );
          results.push(`${config.key}: ${config.value} ✓`);
        } catch (error) {
          results.push(`${config.key}: Erreur - ${error}`);
        }
      }
    }

    document.getElementById("configOutput").textContent = results.join("\n");
    showNotification("Configuration appliquée", "success");
  } catch (error) {
    document.getElementById("configOutput").textContent = `Erreur: ${error}`;
    showNotification(
      "Erreur lors de l'application de la configuration",
      "error"
    );
  } finally {
    showLoading(false);
  }
}

async function resetConfig() {
  // Réinitialiser les champs
  document.getElementById("memory_limit").value = "";
  document.getElementById("max_execution_time").value = "";
  document.getElementById("upload_max_filesize").value = "";
  document.getElementById("post_max_size").value = "";
  document.getElementById("configOutput").textContent =
    "Configuration réinitialisée";
  showNotification("Formulaire réinitialisé", "info");
}

// Gestion des sauvegardes
async function backup() {
  try {
    showLoading(true);
    const result = await window.api.runCommand(
      ["--backup"],
      appState.currentPhpIniPath
    );
    document.getElementById("backupOutput").textContent =
      window.utils.formatOutput(result);
    showNotification("Sauvegarde créée avec succès", "success");
  } catch (error) {
    document.getElementById("backupOutput").textContent = `Erreur: ${error}`;
    showNotification("Erreur lors de la sauvegarde", "error");
  } finally {
    showLoading(false);
  }
}

async function restore() {
  try {
    showLoading(true);
    const result = await window.api.runCommand(
      ["--restore"],
      appState.currentPhpIniPath
    );
    document.getElementById("backupOutput").textContent =
      window.utils.formatOutput(result);
    showNotification("Restauration effectuée avec succès", "success");

    // Actualiser les données après restauration
    await loadInitialData();
  } catch (error) {
    document.getElementById("backupOutput").textContent = `Erreur: ${error}`;
    showNotification("Erreur lors de la restauration", "error");
  } finally {
    showLoading(false);
  }
}

// Informations système
async function showPath() {
  try {
    const result = await window.api.runCommand(
      ["--path"],
      appState.currentPhpIniPath
    );
    document.getElementById("infoOutput").textContent =
      window.utils.formatOutput(result);
  } catch (error) {
    document.getElementById("infoOutput").textContent = `Erreur: ${error}`;
  }
}

async function runPhpInfo() {
  try {
    showLoading(true);
    // Simulation de phpinfo - à adapter selon votre script PHP
    const result = await window.api.runCommand(
      ["--phpinfo"],
      appState.currentPhpIniPath
    );
    const blob = new Blob([result], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    document.getElementById("phpinfoFrame").src = url;

    // Nettoyer l'URL après utilisation
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (error) {
    document.getElementById("phpinfoFrame").srcdoc = `<p>Erreur: ${error}</p>`;
  } finally {
    showLoading(false);
  }
}

// Sélection de fichier php.ini
async function selectPhpIni() {
  try {
    const filePath = await window.api.selectPhpIni();
    if (filePath) {
      appState.currentPhpIniPath = filePath;
      updateStatus(`Fichier sélectionné: ${filePath}`);
      await loadInitialData();
    }
  } catch (error) {
    console.error("Erreur sélection fichier:", error);
    showNotification("Erreur lors de la sélection du fichier", "error");
  }
}

// Utilitaires UI
function showLoading(show) {
  appState.isLoading = show;
  const loader = document.getElementById("loader");
  if (loader) {
    loader.style.display = show ? "block" : "none";
  }

  // Désactiver les boutons pendant le chargement
  const buttons = document.querySelectorAll("button");
  buttons.forEach((btn) => {
    btn.disabled = show;
  });
}

function showNotification(message, type = "info") {
  // Créer une notification toast
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  // Animation d'entrée
  setTimeout(() => notification.classList.add("show"), 100);

  // Supprimer après 5 secondes
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

function updateStatus(message) {
  const statusElement = document.getElementById("statusBar");
  if (statusElement) {
    statusElement.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
  }
}

function disableAllControls() {
  const buttons = document.querySelectorAll("button");
  const inputs = document.querySelectorAll("input");

  buttons.forEach((btn) => (btn.disabled = true));
  inputs.forEach((input) => (input.disabled = true));
}

// Gestion des erreurs globales
window.addEventListener("error", (event) => {
  console.error("Erreur JavaScript:", event.error);
  showNotification("Une erreur est survenue", "error");
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Promise rejetée:", event.reason);
  showNotification("Une erreur asynchrone est survenue", "error");
});
