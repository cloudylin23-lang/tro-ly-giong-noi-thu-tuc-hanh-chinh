// Server local để test không cần Vercel: npm run dev
// Emulator Android gọi qua http://10.0.2.2:3000 ; điện thoại thật cùng wifi gọi qua http://<IP-laptop>:3000
// (Chỉ chạy được với bản debug — bản release APK bắt buộc HTTPS, hãy dùng URL Vercel.)
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import health from '../api/health.js';
import stt from '../api/stt.js';
import turn from '../api/turn.js';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const routes: Record<string, { fetch(req: Request): Promise<Response> }> = {
  '/api/health': health,
  '/api/stt': stt,
  '/api/turn': turn,
};

const PORT = Number(process.env.PORT ?? 3000);

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const route = routes[url.pathname];
  if (!route) {
    res.writeHead(404, { 'Content-Type': 'application/json' }).end('{"error":"Not found"}');
    return;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === 'string') headers.set(k, v);
    else if (Array.isArray(v)) headers.set(k, v.join(', '));
  }
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const response = await route.fetch(
    new Request(url, { method: req.method, headers, body: hasBody ? Buffer.concat(chunks) : undefined }),
  );
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Dev server: http://localhost:${PORT}/api/health`);
});
