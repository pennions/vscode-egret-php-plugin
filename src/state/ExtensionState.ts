import * as vscode from 'vscode';
import { InstalledPhp, ExtensionConfig } from '../types';
import { expandHome } from '../util/platform';

const KEY_INSTALLED = 'egret-php.installed';
const KEY_ACTIVE = 'egret-php.active';

export class ExtensionState {
  constructor(private readonly context: vscode.ExtensionContext) {}

  getActivePhpVersion(): string | undefined {
    return this.context.globalState.get<string>(KEY_ACTIVE);
  }

  async setActivePhpVersion(version: string): Promise<void> {
    await this.context.globalState.update(KEY_ACTIVE, version);
  }

  getInstalledVersions(): InstalledPhp[] {
    return this.context.globalState.get<InstalledPhp[]>(KEY_INSTALLED) ?? [];
  }

  async setInstalledVersions(versions: InstalledPhp[]): Promise<void> {
    await this.context.globalState.update(KEY_INSTALLED, versions);
  }

  async addInstalledVersion(entry: InstalledPhp): Promise<void> {
    const existing = this.getInstalledVersions().filter(v => v.version !== entry.version);
    await this.setInstalledVersions([...existing, entry]);
  }

  async removeInstalledVersion(version: string): Promise<void> {
    const updated = this.getInstalledVersions().filter(v => v.version !== version);
    await this.setInstalledVersions(updated);
    if (this.getActivePhpVersion() === version) {
      await this.context.globalState.update(KEY_ACTIVE, undefined);
    }
  }

  async markHasXdebug(version: string, hasXdebug: boolean): Promise<void> {
    const versions = this.getInstalledVersions().map(v =>
      v.version === version ? { ...v, hasXdebug } : v
    );
    await this.setInstalledVersions(versions);
  }

  getConfig(): ExtensionConfig {
    const cfg = vscode.workspace.getConfiguration('egret-php');
    return {
      installDirectory: cfg.get<string>('installDirectory') ?? '',
      preferNts: cfg.get<boolean>('preferNts') ?? true,
      architecture: cfg.get<'x64' | 'x86'>('architecture') ?? 'x64',
    };
  }

  getInstallBaseDir(): string | undefined {
    const dir = this.getConfig().installDirectory;
    if (!dir) { return undefined; }
    return expandHome(dir);
  }

  async setInstallBaseDir(dir: string): Promise<void> {
    await vscode.workspace.getConfiguration('egret-php')
      .update('installDirectory', dir, vscode.ConfigurationTarget.Global);
  }
}
