import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ExtensionState } from '../state/ExtensionState';
import { DownloadService } from './DownloadService';
import { PhpRelease, InstalledPhp } from '../types';
import { extractZip } from '../util/unzip';

export class PhpInstallService {
  constructor(
    private readonly state: ExtensionState,
    private readonly download: DownloadService
  ) {}

  getInstallPath(version: string): string {
    const base = this.state.getInstallBaseDir();
    if (!base) {
      throw new Error('Install directory not configured');
    }
    return path.join(base, version);
  }

  async install(release: PhpRelease): Promise<InstalledPhp> {
    const base = await this.resolveBaseDir();
    const installPath = path.join(base, release.version);

    if (fs.existsSync(installPath)) {
      const existing = this.state.getInstalledVersions().find(v => v.version === release.version);
      if (existing) {
        throw new Error(`PHP ${release.version} is already installed at ${installPath}`);
      }
      // Directory exists but not tracked — adopt it
    }

    const tempZipPath = path.join(base, release.fileName);

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Installing PHP ${release.version}`,
        cancellable: false,
      },
      async (progress) => {
        await this.download.download(release.zipUrl, tempZipPath, release.sha256, progress);

        progress.report({ message: 'Extracting…' });
        await extractZip(tempZipPath, installPath);

        fs.unlinkSync(tempZipPath);

        const devIni = path.join(installPath, 'php.ini-development');
        const ini = path.join(installPath, 'php.ini');
        if (!fs.existsSync(ini) && fs.existsSync(devIni)) {
          fs.copyFileSync(devIni, ini);
        }
      }
    );

    const entry: InstalledPhp = {
      version: release.version,
      installPath,
      isActive: false,
      hasXdebug: false,
    };

    await this.state.addInstalledVersion(entry);
    return entry;
  }

  async uninstall(version: string): Promise<void> {
    const installed = this.state.getInstalledVersions().find(v => v.version === version);
    if (!installed) {
      throw new Error(`PHP ${version} is not tracked as installed`);
    }

    if (fs.existsSync(installed.installPath)) {
      fs.rmSync(installed.installPath, { recursive: true, force: true });
    }

    await this.state.removeInstalledVersion(version);
  }

  async setActive(version: string): Promise<void> {
    const versions = this.state.getInstalledVersions().map(v => ({
      ...v,
      isActive: v.version === version,
    }));
    await this.state.setInstalledVersions(versions);
    await this.state.setActivePhpVersion(version);
  }

  private async resolveBaseDir(): Promise<string> {
    let base = this.state.getInstallBaseDir();
    if (!base) {
      const picked = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: 'Select PHP install folder',
        title: 'Where should PHP versions be installed?',
      });

      if (!picked || picked.length === 0) {
        throw new Error('No install directory selected');
      }

      base = picked[0].fsPath;
      await this.state.setInstallBaseDir(base);
    }
    return base;
  }
}
