import { PHP_WINDOWS_DOWNLOADS_BASE, PHP_SUPPORTED_VERSIONS } from '../constants';
import { PhpRelease } from '../types';
import { httpsGetString } from '../util/http';

// Matches the Zip download link for a Windows PHP build, then captures
// the sha256 from the <span class="sha256"> that follows within ~600 chars.
// Groups: 1=full zip URL, 2=filename, 3=version, 4=-nts (optional), 5=arch
const BUILD_PATTERN = new RegExp(
  'href="(https://downloads\\.php\\.net/[^"]*/(php-(\\d+\\.\\d+\\.\\d+)(-nts)?-Win32-[a-z0-9]+-([xX][68][64]?)\\.zip))">Zip<\\/a>' +
  '[\\s\\S]{0,600}?' +
  '<span[^>]*class="sha256"[^>]*>[\\s\\S]*?([a-f0-9]{64})',
  'gi'
);

function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (diff !== 0) { return diff; }
  }
  return 0;
}

export class PhpFetchService {
  async fetchReleases(): Promise<PhpRelease[]> {
    const pages = await Promise.all(
      PHP_SUPPORTED_VERSIONS.map(v => httpsGetString(`${PHP_WINDOWS_DOWNLOADS_BASE}${v}`))
    );
    const seen = new Set<string>();
    const releases: PhpRelease[] = [];
    for (const html of pages) {
      for (const r of this.parseWindowsDownloadsPage(html)) {
        const key = `${r.version}|${r.isNts}|${r.arch}`;
        if (!seen.has(key)) {
          seen.add(key);
          releases.push(r);
        }
      }
    }
    return releases.sort((a, b) => compareSemver(a.version, b.version));
  }

  parseWindowsDownloadsPage(html: string): PhpRelease[] {
    const seen = new Set<string>();
    const releases: PhpRelease[] = [];

    BUILD_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = BUILD_PATTERN.exec(html)) !== null) {
      const zipUrl = match[1];
      const fileName = match[2];
      const version = match[3];
      const isNts = match[4] !== undefined;
      const arch = match[5].toLowerCase() === 'x64' ? 'x64' as const : 'x86' as const;
      const sha256 = match[6].toLowerCase();

      const key = `${version}|${isNts}|${arch}`;
      if (seen.has(key)) { continue; }
      seen.add(key);

      releases.push({
        version,
        majorMinor: version.split('.').slice(0, 2).join('.'),
        isNts,
        arch,
        fileName,
        zipUrl,
        sha256,
      });
    }

    return releases.sort((a, b) => compareSemver(a.version, b.version));
  }
}
