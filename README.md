# Egret PHP Stack

A VS Code extension for managing PHP versions on Windows. Download, switch, and configure PHP — including Xdebug — without leaving the editor.

> Linux and macOS support is planned for a future release.

---

## Features

- Browse and download PHP releases (8.2 – 8.5) with SHA256 checksum verification
- Switch the active PHP version (updates PATH and `php.executablePath` automatically)
- Download and install Xdebug for the installed PHP version
- Edit `php.ini` directly in the VS Code editor
- Uninstall PHP versions cleanly

---

## Getting Started

1. Install the extension from the `.vsix` file:
   - Open the Extensions panel (`Ctrl+Shift+X`)
   - Click `...` → **Install from VSIX…**
   - Select `egret-php-stack-0.1.0.vsix`
2. Click the **Egret PHP** icon in the Activity Bar (left sidebar).
3. The **Available** group lists all downloadable PHP versions. The **Installed** group shows versions already on your machine.

---

## Sidebar Panel

The Egret PHP sidebar has two groups:

| Group | Contents |
|---|---|
| **Installed** | PHP versions downloaded and managed by this extension |
| **Available** | PHP versions available to download from php.net |

The active version is marked with a **★** and a green check icon.

Use the **↻ refresh** button in the panel header to reload the version list from php.net.

---

## Downloading PHP

1. Expand the **Available** group in the sidebar.
2. Right-click a version → **Download PHP Version**.
3. On the first download you will be asked to choose an install folder. This is saved as a global setting and used for all subsequent installs.
4. A progress notification shows download and checksum verification status.
5. Once complete the version moves to the **Installed** group.

> Downloads are verified against SHA256 checksums published on php.net before extraction. If verification fails the download is deleted and an error is shown.

---

## Setting the Active PHP Version

Right-click an installed version → **Set as Active PHP**.

This does the following automatically:

1. Removes the previously active version from your **user PATH**
2. Prepends the new version's folder to your **user PATH**
3. Sets `php.executablePath` in VS Code global settings to the new `php.exe`
4. Ensures `extension_dir` is correctly set in the version's `php.ini`
5. Updates the status bar

Open a **new terminal** after switching — existing terminals inherit the old PATH.

The active version is also visible in the **status bar** (bottom-left). Clicking it opens the version picker.

---

## Editing php.ini

Right-click an installed version → **Open php.ini**.

The file opens in the VS Code editor with INI syntax highlighting. Save it as normal (`Ctrl+S`).

> If no `php.ini` exists in the install folder, the extension creates one automatically from `php.ini-development` during download.

---

## Installing Xdebug

1. First install a PHP version (see above).
2. Right-click the installed version → **Download & Install Xdebug**.
3. The extension fetches the correct Xdebug build for your PHP version, thread-safety setting, and architecture from xdebug.org, then verifies its SHA256 checksum.
4. The `.dll` is copied into the `ext/` folder inside your PHP install directory.
5. You will be prompted: **"Add zend_extension to php.ini?"** — click **Yes** to have the extension append the correct `zend_extension` line automatically.

> Xdebug builds are matched by PHP major.minor version (e.g. `8.5`), thread-safety (`NTS`/`TS`), and architecture (`x64`/`x86`). The correct build is selected automatically.

---

## Managing PATH

In addition to the automatic PATH changes when setting a version active, you can manage PATH manually:

- Right-click an installed version → **Add PHP to PATH** — prepends the version's folder to your user PATH
- Right-click an installed version → **Remove PHP from PATH** — removes it from your user PATH

Changes to user PATH require opening a new terminal to take effect.

> On Windows the extension modifies the **user-level** PATH (not system-level), so no administrator privileges are required.

---

## Uninstalling PHP

Right-click an installed version → **Uninstall PHP Version**.

A confirmation dialog is shown before anything is deleted. Uninstalling:

1. Deletes the installation folder and all its contents
2. If it was the active version: removes it from PATH and clears `php.executablePath`

---

## Settings

| Setting | Default | Description |
|---|---|---|
| `egret-php.installDirectory` | *(chosen on first download)* | Base folder where PHP versions are installed. Each version gets its own subfolder, e.g. `<dir>\8.5.6\`. |
| `egret-php.preferNts` | `true` | Prefer Non-Thread-Safe builds. NTS is recommended for CLI and FastCGI use. |
| `egret-php.architecture` | `x64` | Preferred architecture for downloads (`x64` or `x86`). |

---

## Troubleshooting

**The Available list is empty after refresh**
Check the Developer Tools console (`Help → Toggle Developer Tools`) for network errors. Ensure you have internet access and php.net is reachable.

**`php --version` in the terminal still shows the old version**
PATH changes only affect new terminal sessions. Close and reopen your terminal.

**Xdebug fails to load (`module could not be found`)**
Open `php.ini` for the active version and verify:
```ini
extension_dir="C:\your-install-path\8.5.6\ext"
zend_extension="C:\your-install-path\8.5.6\ext\php_xdebug-3.x.x-8.5-nts-vs17-x86_64.dll"
```
Both paths must be absolute. Setting the version as active via the sidebar will fix `extension_dir` automatically.

**VS Code still uses the wrong PHP**
Search VS Code settings for `php.executablePath` and ensure it points to the correct `php.exe`. Setting a version as active in the sidebar updates this automatically.
