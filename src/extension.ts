import * as vscode from 'vscode';
import * as path from 'path';
import { ExtensionState } from './state/ExtensionState';
import { PhpFetchService } from './services/PhpFetchService';
import { DownloadService } from './services/DownloadService';
import { PhpInstallService } from './services/PhpInstallService';
import { XdebugService } from './services/XdebugService';
import { PathService } from './services/PathService';
import { PhpIniService } from './services/PhpIniService';
import { PhpVersionTreeProvider, PhpVersionItem } from './providers/PhpVersionTreeProvider';
import { StatusBarProvider } from './providers/StatusBarProvider';

export function activate(context: vscode.ExtensionContext): void {
  const state = new ExtensionState(context);
  const fetchService = new PhpFetchService();
  const downloadService = new DownloadService();
  const installService = new PhpInstallService(state, downloadService);
  const xdebugService = new XdebugService();
  const pathService = new PathService();
  const iniService = new PhpIniService();

  const treeProvider = new PhpVersionTreeProvider(state, fetchService);
  const statusBar = new StatusBarProvider(state);

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('egretPhpVersions', treeProvider),
    statusBar,

    vscode.commands.registerCommand('egret-php.refreshVersions', () => {
      treeProvider.refresh();
    }),

    vscode.commands.registerCommand('egret-php.downloadPhp', async (item: PhpVersionItem) => {
      if (!item?.release) {
        vscode.window.showErrorMessage('Select a PHP version from the Available list first.');
        return;
      }
      try {
        await installService.install(item.release);
        treeProvider.refresh();
        statusBar.update();
        vscode.window.showInformationMessage(`PHP ${item.release.version} installed successfully.`);
      } catch (err) {
        vscode.window.showErrorMessage(
          `Install failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }),

    vscode.commands.registerCommand('egret-php.setActive', async (item?: PhpVersionItem) => {
      const installed = state.getInstalledVersions();
      if (installed.length === 0) {
        vscode.window.showInformationMessage('No PHP versions installed yet.');
        return;
      }

      let version: string | undefined;

      if (item?.installed) {
        version = item.installed.version;
      } else {
        version = await vscode.window.showQuickPick(
          installed.map(v => v.version),
          { placeHolder: 'Select PHP version to activate' }
        );
      }

      if (!version) { return; }

      // Remove the previously active version from PATH before switching.
      const previous = installed.find(v => v.isActive);
      if (previous && previous.version !== version) {
        pathService.removeFromPath(previous.installPath);
      }

      await installService.setActive(version);

      const next = state.getInstalledVersions().find(v => v.version === version);
      if (next) {
        iniService.ensureExtensionDir(next.installPath);
        pathService.addToPath(next.installPath);
        const phpExe = path.join(next.installPath, 'php.exe');
        await vscode.workspace.getConfiguration('php').update(
          'executablePath',
          phpExe,
          vscode.ConfigurationTarget.Global
        );
      }

      treeProvider.refresh();
      statusBar.update();
    }),

    vscode.commands.registerCommand('egret-php.addToPath', (item: PhpVersionItem) => {
      if (!item?.installed) { return; }
      pathService.addToPath(item.installed.installPath);
    }),

    vscode.commands.registerCommand('egret-php.removeFromPath', (item: PhpVersionItem) => {
      if (!item?.installed) { return; }
      pathService.removeFromPath(item.installed.installPath);
    }),

    vscode.commands.registerCommand('egret-php.downloadXdebug', async (item: PhpVersionItem) => {
      if (!item?.installed) { return; }
      const { version, installPath } = item.installed;
      const cfg = state.getConfig();

      // Determine if installed PHP is NTS — check php.ini-development filename as a hint,
      // or fall back to the tracked release info. We infer from the installPath or ask the user.
      // For simplicity, we use the config preference (preferNts) as the signal.
      const isNts = cfg.preferNts;

      try {
        const build = await xdebugService.fetchRecommended(version, isNts, cfg.architecture);
        await xdebugService.install(build, installPath);
        await state.markHasXdebug(version, true);
        treeProvider.refresh();
      } catch (err) {
        vscode.window.showErrorMessage(
          `Xdebug install failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }),

    vscode.commands.registerCommand('egret-php.openPhpIni', async (item: PhpVersionItem) => {
      if (!item?.installed) { return; }
      try {
        await iniService.openForVersion(item.installed.installPath);
      } catch (err) {
        vscode.window.showErrorMessage(
          `Could not open php.ini: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }),

    vscode.commands.registerCommand('egret-php.uninstallPhp', async (item: PhpVersionItem) => {
      if (!item?.installed) { return; }
      const { version } = item.installed;

      const confirm = await vscode.window.showWarningMessage(
        `Uninstall PHP ${version}? This will delete the installation folder.`,
        { modal: true },
        'Uninstall'
      );
      if (confirm !== 'Uninstall') { return; }

      try {
        const wasActive = item.installed.isActive;
        const installPath = item.installed.installPath;

        await installService.uninstall(version);

        // Clean up PATH and php.executablePath if this was the active version.
        if (wasActive) {
          pathService.removeFromPath(installPath);
          await vscode.workspace.getConfiguration('php').update(
            'executablePath',
            undefined,
            vscode.ConfigurationTarget.Global
          );
        }

        treeProvider.refresh();
        statusBar.update();
        vscode.window.showInformationMessage(`PHP ${version} uninstalled.`);
      } catch (err) {
        vscode.window.showErrorMessage(
          `Uninstall failed: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    })
  );

  statusBar.show();
}

export function deactivate(): void {
  // subscriptions are disposed automatically via context.subscriptions
}
