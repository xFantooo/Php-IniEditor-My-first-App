<div align="center" id="top"> 
  <img src="./.github/app.gif" alt="PHP.ini Editor" />
</div>

<h1 align="center">PHP.ini Editor</h1>

<p align="center">
  <img alt="Github top language" src="https://img.shields.io/github/languages/top/xFantooo/PHP.ini-Editor?color=56BEB8">
  <img alt="Github language count" src="https://img.shields.io/github/languages/count/xFantooo/PHP.ini-Editor?color=56BEB8">
  <img alt="Repository size" src="https://img.shields.io/github/repo-size/xFantooo/PHP.ini-Editor?color=56BEB8">
  <img alt="License" src="https://img.shields.io/github/license/xFantooo/PHP.ini-Editor?color=56BEB8">
</p>

<p align="center">
  A modern, user-friendly desktop application to view, edit, and manage your PHP configuration (php.ini) and extensions, built with Electron.
</p>

<p align="center">
  <a href="#features">Features</a> &#xa0; | &#xa0;
  <a href="#getting-started">Getting Started</a> &#xa0; | &#xa0;
  <a href="#requirements">Requirements</a> &#xa0; | &#xa0;
  <a href="#project-structure">Structure</a> &#xa0; | &#xa0;
  <a href="#faq">FAQ</a> &#xa0; | &#xa0;
  <a href="#contributing">Contributing</a> &#xa0; | &#xa0;
  <a href="#license">License</a>
</p>

---

## ✨ Features

- **Visual editor** for your `php.ini` file
- **Enable/disable PHP extensions** with one click
- **Xdebug toggle** and status
- **Instant search/filter** for extensions
- **Safe backup/restore** of your configuration
- **Beautiful glassmorphism UI**
- **Works offline** (no internet required after install)

---

## 🚀 Getting Started

### 1. Download & Install

- Download the latest release from the [Releases page](https://github.com/xFantooo/PHP.ini-Editor/releases)
- Extract the archive and run `PHPiniEditor.exe`

### 2. Usage

1. **Select your `php.ini` file** (button in the header)
2. **Browse and edit**:
   - Use the tabs to switch between Xdebug, Extensions, and Config
   - Enable/disable extensions with a click
   - Save your changes
3. **Backup/Restore** your config at any time

### 3. Build from Source (Developers)

```bash
# Clone the repo
git clone git@github.com:xFantooo/Php-IniEditor-My-first-App.git
cd PHP.ini-Editor

# Install dependencies
npm install

# Run in dev mode
npm start

# Build Windows executable
npm run package-win
Build output: dist/PHPiniEditor-win32-x64/

To distribute: zip the folder and send it to your users

🛠️ Requirements
Windows 10/11 (x64)

Node.js (for development/build only)

PHP must be installed and accessible on your system

📦 Project Structure
text
Copier
Modifier
php.ini-Editor/
├── main.js               # Electron main process
├── preload.js            # Preload script for IPC
├── renderer.js           # Renderer logic
├── index.html            # App UI
├── style.css             # Styles
├── toggle-xdebug.php     # PHP helper script
├── package.json          # Project configuration
├── icon.ico              # App icon
└── ...
❓ FAQ
📌 The app doesn’t detect my php.ini, what should I do?
Make sure PHP is installed and its path is available in your system environment variables.

📌 Is it compatible with Linux or macOS?
Currently, only Windows is supported. Multi-platform support is planned.

📌 Where is the backup stored?
In the same folder as your php.ini, a file named php.ini-backup is created.

🗺️ Roadmap
 Visual php.ini editor

 Xdebug toggle and status

 Extension toggle

 Backup and restore feature

 Multi-language UI (FR/EN)

 PHP.ini validation and cleaning

 Auto-detect php.ini changes

 Support for Linux/macOS

🔒 Security Notice
⚠️ This tool modifies your php.ini file. Please ensure you make a backup before using it. The app includes a built-in backup feature.

🤝 Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss the improvements.

🙏 Credits
Electron

PHP

Icons from Icons8

Built with ❤️ by xFantooo

📄 License
This project is licensed under the MIT License. See the LICENSE file for details.
```
