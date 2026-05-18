export interface PhpRelease {
  version: string;
  majorMinor: string;
  isNts: boolean;
  arch: 'x64' | 'x86';
  zipUrl: string;
  sha256: string;
  fileName: string;
}

export interface InstalledPhp {
  version: string;
  installPath: string;
  isActive: boolean;
  hasXdebug: boolean;
}

export interface XdebugBuild {
  version: string;
  phpVersion: string;
  architecture: string;
  threadSafe: boolean;
  downloadUrl: string;
  sha256: string;
}

export interface ExtensionConfig {
  installDirectory: string;
  preferNts: boolean;
  architecture: 'x64' | 'x86';
}

export class ChecksumMismatchError extends Error {
  constructor(public readonly filePath: string, public readonly expected: string, public readonly actual: string) {
    super(`Checksum mismatch for ${filePath}: expected ${expected}, got ${actual}`);
    this.name = 'ChecksumMismatchError';
  }
}

export class XdebugNotFoundError extends Error {
  constructor(phpVersion: string, isNts: boolean, arch: string) {
    super(`No Xdebug build found for PHP ${phpVersion} (${isNts ? 'NTS' : 'TS'}, ${arch})`);
    this.name = 'XdebugNotFoundError';
  }
}
