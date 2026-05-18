import * as vscode from 'vscode';
import { ExtensionState } from '../state/ExtensionState';

export class StatusBarProvider implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;

  constructor(private readonly state: ExtensionState) {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = 'egret-php.setActive';
  }

  update(): void {
    const active = this.state.getActivePhpVersion();
    this.item.text = active ? `$(versions) PHP ${active}` : `$(versions) PHP (none)`;
    this.item.tooltip = active
      ? `Active PHP: ${active} — click to switch`
      : 'No active PHP — click to select';
    this.item.show();
  }

  show(): void {
    this.update();
  }

  dispose(): void {
    this.item.dispose();
  }
}
