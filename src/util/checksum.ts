import * as crypto from 'crypto';
import * as fs from 'fs';
import { ChecksumMismatchError } from '../types';

export function computeSha256(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

export async function verifySha256File(filePath: string, expectedHex: string): Promise<void> {
  const actual = await computeSha256(filePath);
  if (actual.toLowerCase() !== expectedHex.toLowerCase()) {
    throw new ChecksumMismatchError(filePath, expectedHex, actual);
  }
}
