import { execSync } from 'child_process';
import * as vscode from 'vscode';
import { isWindows } from '../util/platform';

export class PathService {
  addToPath(phpDir: string): void {
    if (isWindows) {
      this.windowsAddToPath(phpDir);
    } else {
      this.posixShowInstructions(phpDir);
    }
  }

  removeFromPath(phpDir: string): void {
    if (isWindows) {
      this.windowsRemoveFromPath(phpDir);
    } else {
      vscode.window.showInformationMessage(
        `Remove "${phpDir}" from PATH manually in your shell profile.`
      );
    }
  }

  getCurrentPathEntries(): string[] {
    if (isWindows) {
      try {
        const result = execSync(
          'powershell -NoProfile -NonInteractive -Command "[Environment]::GetEnvironmentVariable(\'PATH\', \'User\')"',
          { encoding: 'utf8', windowsHide: true }
        ).trim();
        return result.split(';').filter(Boolean);
      } catch {
        return [];
      }
    }
    return (process.env.PATH ?? '').split(':').filter(Boolean);
  }

  private windowsAddToPath(phpDir: string): void {
    const escaped = phpDir.replace(/'/g, "''");
    try {
      execSync(
        `powershell -NoProfile -NonInteractive -Command ` +
        `"$current = [Environment]::GetEnvironmentVariable('PATH', 'User'); ` +
        `$entries = ($current -split ';') | Where-Object { $_ -ne '' }; ` +
        `if ('${escaped}' -notin $entries) { ` +
        `$entries = @('${escaped}') + $entries; ` +
        `[Environment]::SetEnvironmentVariable('PATH', ($entries -join ';'), 'User') ` +
        `}"`,
        { encoding: 'utf8', windowsHide: true }
      );
      vscode.window.showInformationMessage(
        `Added ${phpDir} to user PATH. Restart your terminal for the change to take effect.`
      );
    } catch (err) {
      vscode.window.showErrorMessage(
        `Failed to update PATH: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  private windowsRemoveFromPath(phpDir: string): void {
    const escaped = phpDir.replace(/'/g, "''");
    try {
      execSync(
        `powershell -NoProfile -NonInteractive -Command ` +
        `"$current = [Environment]::GetEnvironmentVariable('PATH', 'User'); ` +
        `$entries = ($current -split ';') | Where-Object { $_ -ne '' -and $_ -ne '${escaped}' }; ` +
        `[Environment]::SetEnvironmentVariable('PATH', ($entries -join ';'), 'User')"`,
        { encoding: 'utf8', windowsHide: true }
      );
      vscode.window.showInformationMessage(
        `Removed ${phpDir} from user PATH. Restart your terminal for the change to take effect.`
      );
    } catch (err) {
      vscode.window.showErrorMessage(
        `Failed to update PATH: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  private posixShowInstructions(phpDir: string): void {
    vscode.window.showInformationMessage(
      `Add the following to your shell profile (.bashrc / .zshrc):`,
      'Copy command'
    ).then(choice => {
      if (choice === 'Copy command') {
        vscode.env.clipboard.writeText(`export PATH="${phpDir}:$PATH"`);
        vscode.window.showInformationMessage('Copied to clipboard.');
      }
    });
  }
}
