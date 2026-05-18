import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { httpsGetStream } from '../util/http';
import { verifySha256File } from '../util/checksum';

export class DownloadService {
  async download(
    fileUrl: string,
    destPath: string,
    expectedHex: string,
    progress: vscode.Progress<{ message?: string; increment?: number }>
  ): Promise<void> {
    if (!expectedHex) {
      throw new Error(`No SHA256 checksum available for ${fileUrl} — cannot verify download.`);
    }

    fs.mkdirSync(path.dirname(destPath), { recursive: true });

    const dest = fs.createWriteStream(destPath);
    let lastIncrement = 0;

    progress.report({ message: 'Downloading…', increment: 0 });

    try {
      await httpsGetStream(fileUrl, dest, (downloaded, total) => {
        const pct = Math.floor((downloaded / total) * 100);
        const inc = pct - lastIncrement;
        if (inc >= 2) {
          progress.report({
            message: `Downloading… ${pct}%`,
            increment: inc,
          });
          lastIncrement = pct;
        }
      });
    } catch (err) {
      this.cleanup(destPath);
      throw err;
    }

    progress.report({ message: 'Verifying checksum…', increment: 0 });

    try {
      await verifySha256File(destPath, expectedHex);
    } catch (err) {
      this.cleanup(destPath);
      throw err;
    }

    progress.report({ message: 'Done', increment: 100 - lastIncrement });
  }

  private cleanup(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {
      // best effort
    }
  }
}
