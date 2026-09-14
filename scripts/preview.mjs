import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { root } from './build.mjs';
const base = path.join(root, 'dist');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let filename = path.resolve(base, '.' + pathname);
    if (!filename.startsWith(base + path.sep) && filename !== base) throw new Error('Outside dist');
    if (!path.extname(filename)) filename = path.join(filename, 'index.html');
    const body = await readFile(filename);
    res.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Not found');
  }
}).listen(4173, '127.0.0.1', () => console.log('Preview: http://127.0.0.1:4173 (generated dist only)'));
