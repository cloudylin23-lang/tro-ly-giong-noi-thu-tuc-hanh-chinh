import { errorFields, log, newRequestId, withRequest } from './log.js';
import { HttpError } from './openai.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-app-token, x-request-id',
  'Access-Control-Expose-Headers': 'x-request-id',
};

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: CORS });
}

/**
 * Bọc handler: CORS, request id, kiểm tra token, log có cấu trúc, bắt lỗi thành JSON.
 * Mọi log trong fn tự có reqId. Response luôn có header x-request-id; lỗi trả { error, requestId }.
 */
export function handler(fn: (req: Request) => Promise<Response>) {
  return {
    async fetch(req: Request): Promise<Response> {
      if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
      const reqId = newRequestId(req.headers.get('x-request-id'));
      const fields = {
        method: req.method,
        path: new URL(req.url).pathname,
        ...(req.headers.get('x-vercel-id') ? { vercelId: req.headers.get('x-vercel-id') } : {}),
      };
      return withRequest(reqId, fields, async () => {
        const started = Date.now();
        let res: Response;
        try {
          checkToken(req);
          res = await fn(req);
          log.info('request', { status: res.status, ms: Date.now() - started });
        } catch (err) {
          const status = err instanceof HttpError ? err.status : 500;
          const message = err instanceof Error ? err.message : String(err);
          (status >= 500 ? log.error : log.warn)('request', { status, ms: Date.now() - started, ...errorFields(err) });
          res = json({ error: message, requestId: reqId }, status);
        }
        res.headers.set('x-request-id', reqId);
        return res;
      });
    },
  };
}

function checkToken(req: Request) {
  const expected = process.env.APP_TOKEN;
  if (!expected) return;
  if (req.headers.get('x-app-token') !== expected) throw new HttpError(401, 'Sai app token');
}
