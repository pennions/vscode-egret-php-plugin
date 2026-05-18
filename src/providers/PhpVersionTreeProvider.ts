import * as vscode from 'vscode';
import { ExtensionState } from '../state/ExtensionState';
import { PhpFetchService } from '../services/PhpFetchService';
import { PhpRelease, InstalledPhp } from '../types';

type TreeNode = GroupItem | PhpVersionItem | vscode.TreeItem;

class GroupItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly contextValue: 'group' = 'group'
  ) {
    super(label, vscode.TreeItemCollapsibleState.Expanded);
  }
}

export class PhpVersionItem extends vscode.TreeItem {
  constructor(
    label: string,
    public readonly release: PhpRelease | undefined,
    public readonly installed: InstalledPhp | undefined
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.contextValue = installed ? 'installedPhpVersion' : 'remotePhpVersion';

    if (installed) {
      this.description = installed.isActive ? 'active' : installed.installPath;
      this.iconPath = installed.isActive
        ? new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'))
        : new vscode.ThemeIcon('versions');
      this.tooltip = `Installed at: ${installed.installPath}${installed.hasXdebug ? '\nXdebug: installed' : ''}`;
    } else if (release) {
      this.description = `${release.isNts ? 'NTS' : 'TS'}, ${release.arch}`;
      this.iconPath = new vscode.ThemeIcon('cloud-download');
      this.tooltip = release.zipUrl;
    }
  }
}

export class PhpVersionTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private remoteReleases: PhpRelease[] = [];
  private loadError: string | undefined;
  private loading = false;
  private fetched = false;

  constructor(
    private readonly state: ExtensionState,
    private readonly fetchService: PhpFetchService
  ) {}

  refresh(): void {
    this.remoteReleases = [];
    this.loadError = undefined;
    this.fetched = false;
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TreeNode): Promise<TreeNode[]> {
    if (element instanceof GroupItem) {
      if (element.label === 'Installed') {
        return this.getInstalledItems();
      }
      if (element.label === 'Available') {
        return this.getRemoteItems();
      }
      return [];
    }

    // Root level: two groups
    return [new GroupItem('Installed'), new GroupItem('Available')];
  }

  private getInstalledItems(): PhpVersionItem[] {
    const cfg = this.state.getConfig();
    const installed = this.state.getInstalledVersions();
    return installed.map(v => {
      const label = `PHP ${v.version}${v.isActive ? ' ★' : ''}`;
      return new PhpVersionItem(label, undefined, v);
    });
  }

  private async getRemoteItems(): Promise<TreeNode[]> {
    if (!this.fetched && !this.loading) {
      this.loading = true;
      try {
        const cfg = this.state.getConfig();
        const all = await this.fetchService.fetchReleases();
        const installedVersions = new Set(this.state.getInstalledVersions().map(v => v.version));

        this.remoteReleases = all.filter(r =>
          r.isNts === cfg.preferNts &&
          r.arch === cfg.architecture &&
          !installedVersions.has(r.version)
        );

        this.loadError = undefined;
      } catch (err) {
        this.loadError = err instanceof Error ? err.message : String(err);
        this.remoteReleases = [];
      } finally {
        this.loading = false;
        this.fetched = true;
        this._onDidChangeTreeData.fire(undefined);
      }
    }

    if (this.loadError) {
      const errItem = new vscode.TreeItem(`Error: ${this.loadError}`);
      errItem.iconPath = new vscode.ThemeIcon('error');
      return [errItem];
    }

    return this.remoteReleases.map(r => {
      const label = `PHP ${r.version}`;
      return new PhpVersionItem(label, r, undefined);
    });
  }
}
