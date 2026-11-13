import { HttpError } from './openai.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-app-token',
};

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: CORS });
}

/** Bọc handler: CORS, kiểm tra token, bắt lỗi thành JSON. */
export function handler(fn: (req: Request) => Promise<Response>) {
  return {
    async fetch(req: Request): Promise<Response> {
      if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
      const started = Date.now();
      try {
        checkToken(req);
        const res = await fn(req);
        console.log(`${req.method} ${new URL(req.url).pathname} ${res.status} ${Date.now() - started}ms`);
        return res;
      } catch (err) {
        const status = err instanceof HttpError ? err.status : 500;
        const message = err instanceof Error ? err.message : String(err);
        console.error(`${req.method} ${new URL(req.url).pathname} ${status}`, message);
        return json({ error: message }, status);
      }
    },
  };
}

function checkToken(req: Request) {
  const expected = process.env.APP_TOKEN;
  if (!expected) return;
  if (req.headers.get('x-app-token') !== expected) throw new HttpError(401, 'Sai app token');
}
