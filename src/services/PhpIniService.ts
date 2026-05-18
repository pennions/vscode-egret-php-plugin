import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export class PhpIniService {
  locatePhpIni(phpInstallPath: string): string {
    const candidates = [
      path.join(phpInstallPath, 'php.ini'),
      path.join(phpInstallPath, 'php.ini-development'),
      path.join(phpInstallPath, 'php.ini-production'),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    throw new Error(`No php.ini found in ${phpInstallPath}`);
  }

  async openForVersion(phpInstallPath: string): Promise<void> {
    const iniPath = this.locatePhpIni(phpInstallPath);
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(iniPath));
    await vscode.window.showTextDocument(doc);
  }

  // Ensures extension_dir is set to the absolute ext/ path.
  // Appends the setting if it isn't already present as an uncommented line.
  ensureExtensionDir(phpInstallPath: string): void {
    const iniPath = path.join(phpInstallPath, 'php.ini');
    if (!fs.existsSync(iniPath)) { return; }

    const extDir = path.join(phpInstallPath, 'ext');
    const content = fs.readFileSync(iniPath, 'utf8');

    // Check if an uncommented extension_dir is already set to this exact path.
    const alreadySet = new RegExp(`^extension_dir\\s*=\\s*["']?${escapeRegex(extDir)}["']?`, 'm').test(content);
    if (alreadySet) { return; }

    fs.appendFileSync(iniPath, `\n; Set by Egret PHP Stack\nextension_dir="${extDir}"\n`);
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
