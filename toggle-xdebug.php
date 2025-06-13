<?php

// Configuration ultra-stricte pour éliminer TOUTE sortie parasite
error_reporting(0);
ini_set('display_errors', 'Off');
ini_set('display_startup_errors', 'Off');
ini_set('log_errors', 'Off');
ini_set('html_errors', 'Off');
ini_set('auto_prepend_file', '');
ini_set('auto_append_file', '');

// Rediriger STDERR vers /dev/null (ou NUL sur Windows)
if (PHP_OS_FAMILY === 'Windows') {
    @ini_set('error_log', 'NUL');
} else {
    @ini_set('error_log', '/dev/null');
}

// Gestionnaire d'erreur personnalisé pour capturer tout
set_error_handler(function($severity, $message, $file, $line) {
    // Ne rien faire - absorber toutes les erreurs
    return true;
});

// Gestionnaire d'exception pour capturer les exceptions non gérées
set_exception_handler(function($exception) {
    // Ne rien faire - absorber toutes les exceptions
});

// Nettoyer complètement tous les buffers existants
while (ob_get_level()) {
    ob_end_clean();
}

// Démarrer un buffer propre
ob_start();

// Fonctions utiles avec gestion d'erreur améliorée

function logMessage(string $message): void {
    @file_put_contents(__DIR__ . "/xdebug_toggle.log", date('[Y-m-d H:i:s] ') . $message . PHP_EOL, FILE_APPEND | LOCK_EX);
}

function getPhpIniPath(): string {
    $iniPath = @php_ini_loaded_file();
    if ($iniPath === false) {
        // Essayer des chemins communs
        $commonPaths = [
            '/etc/php.ini',
            '/usr/local/etc/php.ini',
            '/opt/php/php.ini',
            'C:\php\php.ini',
            'C:\xampp\php\php.ini',
            'C:\wamp\bin\php\php.ini'
        ];
        
        foreach ($commonPaths as $path) {
            if (@file_exists($path)) {
                return $path;
            }
        }
        
        // Si aucun trouvé, créer un fichier temporaire
        $tempIni = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'php_temp.ini';
        @file_put_contents($tempIni, "; Fichier php.ini temporaire\n");
        return $tempIni;
    }
    return $iniPath;
}

function readIni(string $path): string {
    if (!@file_exists($path)) {
        return "; Fichier introuvable\n";
    }
    $content = @file_get_contents($path);
    if ($content === false) {
        return "; Erreur de lecture\n";
    }
    return $content;
}

function backupIni(string $path): void {
    $backup = $path . '.bak';
    if (!@file_exists($backup)) {
        @copy($path, $backup);
    }
}

function writeIni(string $path, string $content): void {
    backupIni($path);
    @file_put_contents($path, $content, LOCK_EX);
}

function restoreIni(string $path): void {
    $backup = $path . '.bak';
    if (@file_exists($backup)) {
        @copy($backup, $path);
        echo "Sauvegarde restaurée avec succès.\n";
    } else {
        echo "Aucune sauvegarde trouvée.\n";
    }
}

function toggleXdebug(string $path, bool $enable, bool $dryRun = false): void {
    $ini = readIni($path);
    $pattern = '/^;?(zend_extension\s*=.*php_xdebug[^\r\n]*)/im';

    if (preg_match($pattern, $ini, $matches)) {
        $currentLine = $matches[0];
        if ($enable) {
            $newLine = preg_replace('/^;/', '', $currentLine);
        } else {
            if (strpos($currentLine, ';') !== 0) {
                $newLine = ';' . $currentLine;
            } else {
                $newLine = $currentLine;
            }
        }
        $newIni = preg_replace($pattern, $newLine, $ini, 1);

        if ($newIni === $ini) {
            echo $enable ? "Xdebug est déjà activé.\n" : "Xdebug est déjà désactivé.\n";
            return;
        }

        if ($dryRun) {
            echo "--- Simulation (dry-run) ---\n";
            echo $newIni;
        } else {
            writeIni($path, $newIni);
            echo $enable ? "Xdebug activé.\n" : "Xdebug désactivé.\n";
            logMessage(($enable ? "Activation" : "Désactivation") . " de Xdebug dans $path");
        }
    } else {
        echo "Xdebug n'a pas été trouvé dans le fichier php.ini.\n";
    }
}

function showStatus(string $path): void {
    $ini = readIni($path);
    if (preg_match('/^zend_extension\s*=.*php_xdebug/m', $ini)) {
        echo "Xdebug est ACTIVÉ\n";
    } elseif (preg_match('/^;zend_extension\s*=.*php_xdebug/m', $ini)) {
        echo "Xdebug est DÉSACTIVÉ\n";
    } else {
        echo "Xdebug n'a pas été trouvé dans le fichier php.ini.\n";
    }
}

function setIniOption(string $path, string $key, string $value): void {
    $ini = readIni($path);
    $pattern = "/^\s*" . preg_quote($key, '/') . "\s*=.*$/m";
    $replacement = "$key = $value";

    if (preg_match($pattern, $ini)) {
        $newIni = preg_replace($pattern, $replacement, $ini, 1);
    } else {
        $newIni = $ini . PHP_EOL . $replacement;
    }

    writeIni($path, $newIni);
    echo "Option $key modifiée à $value.\n";
    logMessage("Modification de $key à $value dans $path");
}

function showHelp(): void {
    echo <<<HELP
Utilisation :
  php toggle-xdebug.php [--enable|--disable|--status|--restore|--version|--dry-run|--list|--set key=value|--path=chemin|--list-extensions|--enable-ext=extname|--disable-ext=extname|--help]

Options :
  --enable           Activer Xdebug
  --disable          Désactiver Xdebug
  --status           Afficher le statut actuel de Xdebug
  --restore          Restaurer php.ini depuis la sauvegarde
  --version          Afficher la version PHP et le chemin du php.ini
  --dry-run          Simuler les modifications sans enregistrer
  --list             Lister les extensions PHP chargées (simplifié)
  --set key=value    Modifier une option php.ini
  --path=chemin      Chemin vers le fichier php.ini (optionnel, autodétecté si absent)
  --list-extensions  Lister toutes les extensions disponibles avec leur état
  --enable-ext=NAME  Activer une extension
  --disable-ext=NAME Désactiver une extension
  --help             Afficher cette aide

HELP;
}

function getConfDir(string $phpIniPath): string {
    $dir = dirname($phpIniPath) . DIRECTORY_SEPARATOR . 'conf.d';
    if (@is_dir($dir)) {
        return $dir;
    }
    
    $possibleDirs = [
        '/etc/php/conf.d',
        '/etc/php.d',
        '/usr/local/etc/php/conf.d',
        dirname($phpIniPath) . '/conf.d',
    ];
    
    foreach ($possibleDirs as $d) {
        if (@is_dir($d)) return $d;
    }
    
    return '';
}

function getAllExtensions(string $phpIniPath): array {
    $extensions = [];

    try {
        // 1. Lire le contenu de php.ini
        $phpIniContent = @file_get_contents($phpIniPath);
        if ($phpIniContent === false) {
            $phpIniContent = '';
        }
        
        $lines = explode("\n", $phpIniContent);
        $extPattern = '/^\s*(;)?\s*extension\s*=\s*([^;\s]+)\s*(?:;.*)?$/i';

        foreach ($lines as $line) {
            if (preg_match($extPattern, $line, $m)) {
                $enabled = $m[1] !== ';';
                $extNameRaw = $m[2];
                $extName = preg_replace('/\.(so|dll)$/i', '', $extNameRaw);
                $extensions[strtolower($extName)] = [
                    'enabled' => $enabled,
                    'iniFile' => $phpIniPath,
                    'line' => trim($line),
                    'version' => null,
                    'description' => null,
                ];
            }
        }

        // 2. Scanner conf.d s'il existe
        $confDir = getConfDir($phpIniPath);
        if ($confDir !== '' && @is_dir($confDir)) {
            $files = @scandir($confDir);
            if ($files !== false) {
                foreach ($files as $file) {
                    if (preg_match('/\.ini$/i', $file)) {
                        $fullPath = $confDir . DIRECTORY_SEPARATOR . $file;
                        $content = @file_get_contents($fullPath);
                        if ($content !== false) {
                            $lines = explode("\n", $content);
                            foreach ($lines as $line) {
                                if (preg_match($extPattern, $line, $m)) {
                                    $enabled = $m[1] !== ';';
                                    $extNameRaw = $m[2];
                                    $extName = preg_replace('/\.(so|dll)$/i', '', $extNameRaw);
                                    $key = strtolower($extName);
                                    $extensions[$key] = [
                                        'enabled' => $enabled,
                                        'iniFile' => $fullPath,
                                        'line' => trim($line),
                                        'version' => null,
                                        'description' => null,
                                    ];
                                }
                            }
                        }
                    }
                }
            }
        }

        // 3. Compléter avec extensions chargées
        $loadedExtensions = @get_loaded_extensions();
        if ($loadedExtensions !== false) {
            foreach ($loadedExtensions as $loadedExt) {
                $key = strtolower($loadedExt);
                if (!isset($extensions[$key])) {
                    $version = @phpversion($loadedExt);
                    $extensions[$key] = [
                        'enabled' => true,
                        'iniFile' => '',
                        'line' => '',
                        'version' => $version ?: null,
                        'description' => null,
                    ];
                } else {
                    if (!$extensions[$key]['version']) {
                        $version = @phpversion($loadedExt);
                        $extensions[$key]['version'] = $version ?: null;
                    }
                }
            }
        }

        // 4. Description par défaut
        foreach ($extensions as $k => &$ext) {
            if ($ext['description'] === null) {
                $ext['description'] = ucfirst($k) . " extension PHP";
            }
        }

        ksort($extensions);
        return $extensions;
        
    } catch (Exception $e) {
        return [];
    } catch (Throwable $e) {
        return [];
    }
}

function toggleExtension(string $extName, bool $enable, string $phpIniPath): void {
    $extName = strtolower($extName);
    $allExt = getAllExtensions($phpIniPath);

    if (!isset($allExt[$extName])) {
        echo "Extension '$extName' inconnue.\n";
        return;
    }

    $iniFile = $allExt[$extName]['iniFile'];
    if (!$iniFile || !@file_exists($iniFile)) {
        echo "Impossible de modifier l'activation de '$extName'.\n";
        return;
    }

    $content = readIni($iniFile);
    $lines = explode("\n", $content);
    $changed = false;

    $pattern = '/^(\s*);?\s*extension\s*=\s*(' . preg_quote($extName, '/') . '\.(so|dll))\s*(;.*)?$/i';

    foreach ($lines as $i => $line) {
        if (preg_match($pattern, $line)) {
            if ($enable) {
                $lines[$i] = preg_replace('/^\s*;/', '', $line);
            } else {
                if (strpos(trim($line), ';') !== 0) {
                    $lines[$i] = ';' . $line;
                }
            }
            $changed = true;
            break;
        }
    }

    if (!$changed && $enable) {
        $extFileName = $extName . (PHP_SHLIB_SUFFIX === 'dll' ? '.dll' : '.so');
        $lines[] = "extension=$extFileName";
        $changed = true;
    }

    if ($changed) {
        $newContent = implode("\n", $lines);
        writeIni($iniFile, $newContent);
        echo ($enable ? "Activation" : "Désactivation") . " de l'extension $extName\n";
        logMessage(($enable ? "Activation" : "Désactivation") . " extension $extName dans $iniFile");
    } else {
        echo "Extension $extName " . ($enable ? "déjà activée" : "déjà désactivée") . ".\n";
    }
}

// POINT D'ENTRÉE avec gestion d'erreur ultra-stricte

try {
    $options = @getopt('', [
        'enable',
        'disable',
        'status',
        'restore',
        'version',
        'dry-run',
        'list',
        'set:',
        'path:',
        'help',
        'list-extensions',
        'enable-ext:',
        'disable-ext:',
        'phpinfo',
        'backup',
    ]);

    if ($options === false) {
        $options = [];
    }

    $phpIniPath = isset($options['path']) ? $options['path'] : getPhpIniPath();

    if (isset($options['help'])) {
        showHelp();
        exit(0);
    }

    if (isset($options['list-extensions'])) {
        // Nettoyer complètement avant de sortir le JSON
        while (ob_get_level()) {
            ob_end_clean();
        }
        
        // Désactiver temporairement toute sortie d'erreur
        $originalErrorReporting = error_reporting(0);
        
        try {
            $exts = getAllExtensions($phpIniPath);
            
            // S'assurer que nous avons au moins un tableau vide
            if (!is_array($exts)) {
                $exts = [];
            }
            
            // Définir le content-type pour le web
            if (isset($_SERVER['HTTP_HOST']) && !headers_sent()) {
                header('Content-Type: application/json; charset=utf-8');
            }
            
            // Encoder en JSON avec gestion d'erreur stricte
            $json = @json_encode($exts, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            
            if ($json === false) {
                $json = '{}';
            }
            
            echo $json;
            
        } catch (Exception $e) {
            echo '{"error": "Erreur lors de la récupération des extensions"}';
        } catch (Throwable $e) {
            echo '{"error": "Erreur fatale"}';
        } finally {
            error_reporting($originalErrorReporting);
        }
        
        exit(0);
    }

    // Autres options...
    if (isset($options['enable-ext'])) {
        toggleExtension($options['enable-ext'], true, $phpIniPath);
        exit(0);
    }

    if (isset($options['disable-ext'])) {
        toggleExtension($options['disable-ext'], false, $phpIniPath);
        exit(0);
    }

    if (isset($options['enable'])) {
        toggleXdebug($phpIniPath, true, isset($options['dry-run']));
        exit(0);
    }

    if (isset($options['disable'])) {
        toggleXdebug($phpIniPath, false, isset($options['dry-run']));
        exit(0);
    }

    if (isset($options['status'])) {
        showStatus($phpIniPath);
        exit(0);
    }

    if (isset($options['restore'])) {
        restoreIni($phpIniPath);
        exit(0);
    }

    if (isset($options['backup'])) {
        backupIni($phpIniPath);
        echo "Sauvegarde créée avec succès.\n";
        exit(0);
    }

    if (isset($options['version'])) {
        echo "PHP version: " . phpversion() . PHP_EOL;
        echo "Fichier php.ini utilisé: $phpIniPath" . PHP_EOL;
        exit(0);
    }

    if (isset($options['list'])) {
        $exts = @get_loaded_extensions();
        if ($exts !== false) {
            foreach ($exts as $e) {
                echo $e . PHP_EOL;
            }
        }
        exit(0);
    }

    if (isset($options['phpinfo'])) {
        ob_start();
        @phpinfo();
        $phpinfo = ob_get_clean();
        echo $phpinfo;
        exit(0);
    }

    if (isset($options['set'])) {
        $set = $options['set'];
        if (strpos($set, '=') === false) {
            echo "Option --set doit être sous la forme key=value\n";
            exit(1);
        }
        list($key, $value) = explode('=', $set, 2);
        setIniOption($phpIniPath, trim($key), trim($value));
        exit(0);
    }

    showHelp();
    
} catch (Exception $e) {
    echo '{"error": "Exception PHP"}';
    exit(1);
} catch (Throwable $e) {
    echo '{"error": "Erreur fatale PHP"}';
    exit(1);
}