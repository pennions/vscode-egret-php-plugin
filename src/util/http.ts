import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as url from 'url';

const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);

function request(targetUrl: string, depth = 0): Promise<http.IncomingMessage> {
  if (depth > 10) {
    return Promise.reject(new Error(`Too many redirects for ${targetUrl}`));
  }
  return new Promise((resolve, reject) => {
    const parsed = new url.URL(targetUrl);
    const lib = parsed.protocol === 'https:' ? https : http;
    lib.get(targetUrl, (res) => {
      const status = res.statusCode ?? 0;
      if (REDIRECT_CODES.has(status)) {
        // Consume and discard the redirect body so the socket is freed.
        res.resume();
        const location = res.headers.location;
        if (!location) {
          reject(new Error(`Redirect (${status}) with no Location header from ${targetUrl}`));
          return;
        }
        const redirectUrl = location.startsWith('http')
          ? location
          : new url.URL(location, targetUrl).toString();
        request(redirectUrl, depth + 1).then(resolve, reject);
      } else {
        resolve(res);
      }
    }).on('error', reject);
  });
}

export async function httpsGetString(targetUrl: string): Promise<string> {
  const res = await request(targetUrl);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    res.on('data', (chunk: Buffer) => chunks.push(chunk));
    res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    res.on('error', reject);
  });
}

export async function httpsGetBuffer(targetUrl: string): Promise<Buffer> {
  const res = await request(targetUrl);
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    res.on('data', (chunk: Buffer) => chunks.push(chunk));
    res.on('end', () => resolve(Buffer.concat(chunks)));
    res.on('error', reject);
  });
}

export async function httpsGetStream(
  targetUrl: string,
  dest: fs.WriteStream,
  onProgress?: (downloaded: number, total: number) => void
): Promise<void> {
  const res = await request(targetUrl);
  const total = parseInt(res.headers['content-length'] ?? '0', 10);
  let downloaded = 0;

  return new Promise((resolve, reject) => {
    res.on('data', (chunk: Buffer) => {
      downloaded += chunk.length;
      if (onProgress && total > 0) {
        onProgress(downloaded, total);
      }
    });
    res.pipe(dest);
    dest.on('finish', resolve);
    dest.on('error', reject);
    res.on('error', reject);
  });
}
