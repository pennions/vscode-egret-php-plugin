import * as fs from 'fs';
import * as path from 'path';
import AdmZip from 'adm-zip';

export function extractZip(zipPath: string, destDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      fs.mkdirSync(destDir, { recursive: true });
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(destDir, true);
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

export function zipContainsEntry(zipPath: string, entryName: string): boolean {
  const zip = new AdmZip(zipPath);
  return zip.getEntry(entryName) !== null;
}

export function listZipEntries(zipPath: string): string[] {
  const zip = new AdmZip(zipPath);
  return zip.getEntries().map(e => e.entryName);
}

// Returns the single top-level directory inside a zip, if all entries share one.
// PHP zips do NOT have a top-level folder — files sit at root level.
// Returns null if no common prefix found.
export function detectZipRoot(zipPath: string): string | null {
  const entries = listZipEntries(zipPath);
  if (entries.length === 0) { return null; }
  const first = entries[0].split('/')[0];
  const allMatch = entries.every(e => e.startsWith(first + '/') || e === first);
  return allMatch ? first : null;
}
