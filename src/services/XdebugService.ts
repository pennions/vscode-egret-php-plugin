import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import { XdebugBuild, XdebugNotFoundError } from '../types';
import { httpsGetString, httpsGetStream } from '../util/http';
import { verifySha256File } from '../util/checksum';

const XDEBUG_DOWNLOAD_PAGE = 'https://xdebug.org/download';
const XDEBUG_FILES_BASE = 'https://xdebug.org';

// Matches each DLL entry on xdebug.org/download, e.g.:
// title="SHA256:&nbsp;abc123..." href='/files/php_xdebug-3.5.1-8.3-nts-vs16-x86_64.dll'
const DLL_PATTERN = /title="SHA256:&nbsp;([a-f0-9]{64})"[^>]+href='(\/files\/(php_xdebug-([\d.]+)-([\d.]+)-(nts|ts)-(vs\d+)-(x86_64|i386)\.dll))'/gi;

export class XdebugService {
  async fetchRecommended(phpVersion: string, isNts: boolean, arch: 'x64' | 'x86'): Promise<XdebugBuild> {
    const html = await httpsGetString(XDEBUG_DOWNLOAD_PAGE);
    const builds = this.parseDownloadPage(html);

    const majorMinor = phpVersion.split('.').slice(0, 2).join('.');
    const xdebugArch = arch === 'x64' ? 'x86_64' : 'i386';

    const match = builds.find(b =>
      b.phpVersion === majorMinor &&
      b.architecture === xdebugArch &&
      (isNts ? !b.threadSafe : b.threadSafe)
    );

    if (!match) {
      throw new XdebugNotFoundError(majorMinor, isNts, arch);
    }
    return match;
  }

  parseDownloadPage(html: string): XdebugBuild[] {
    const builds: XdebugBuild[] = [];
    DLL_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = DLL_PATTERN.exec(html)) !== null) {
      const sha256 = match[1].toLowerCase();
      const filePath = match[2];   // /files/php_xdebug-...dll
      const fileName = match[3];   // php_xdebug-...dll
      const xdebugVersion = match[4];
      const phpVersion = match[5];
      const tsFlag = match[6];      // nts | ts
      const vsVersion = match[7];
      const architecture = match[8]; // x86_64 | i386

      builds.push({
        version: xdebugVersion,
        phpVersion,
        architecture,
        threadSafe: tsFlag === 'ts',
        downloadUrl: `${XDEBUG_FILES_BASE}${filePath}`,
        sha256,
      });
    }

    return builds;
  }

  async install(build: XdebugBuild, phpInstallPath: string): Promise<void> {
    const dllName = path.basename(build.downloadUrl);
    const extDir = path.join(phpInstallPath, 'ext');
    const destPath = path.join(extDir, dllName);
    const tempPath = path.join(os.tmpdir(), `xdebug-${Date.now()}-${dllName}`);

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Installing Xdebug ${build.version}`,
        cancellable: false,
      },
      async (progress) => {
        progress.report({ message: 'Downloading DLL…' });

        const dest = fs.createWriteStream(tempPath);
        try {
          await httpsGetStream(build.downloadUrl, dest, (downloaded, total) => {
            if (total > 0) {
              const pct = Math.floor((downloaded / total) * 100);
              progress.report({ message: `Downloading… ${pct}%` });
            }
          });
        } catch (err) {
          this.cleanup(tempPath);
          throw err;
        }

        progress.report({ message: 'Verifying checksum…' });
        try {
          await verifySha256File(tempPath, build.sha256);
        } catch (err) {
          this.cleanup(tempPath);
          throw err;
        }

        fs.mkdirSync(extDir, { recursive: true });
        fs.copyFileSync(tempPath, destPath);
        this.cleanup(tempPath);

        progress.report({ message: 'Done' });
      }
    );

    const iniPath = path.join(phpInstallPath, 'php.ini');
    if (fs.existsSync(iniPath)) {
      const answer = await vscode.window.showInformationMessage(
        `Xdebug ${build.version} installed. Add zend_extension="${dllName}" to php.ini?`,
        'Yes', 'No'
      );
      if (answer === 'Yes') {
        fs.appendFileSync(iniPath, `\n[xdebug]\nzend_extension="${destPath}"\n`);
      }
    }
  }

  private cleanup(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) { fs.unlinkSync(filePath); }
    } catch {
      // best effort
    }
  }
}
