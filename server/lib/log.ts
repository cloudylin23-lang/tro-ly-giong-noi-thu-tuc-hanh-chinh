// Log có cấu trúc: mỗi dòng là 1 JSON, tự gắn request id của request đang chạy.
// Xem trên Vercel → Logs, lọc theo reqId để truy lại đúng một phiên lỗi.
//
// QUY TẮC: không log nội dung câu nói, số căn cước, số điện thoại… — chỉ log độ dài / metadata.
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

type Fields = Record<string, unknown>;
type Level = 'info' | 'warn' | 'error';

interface RequestContext {
  reqId: string;
  fields: Fields;
}

const store = new AsyncLocalStorage<RequestContext>();

/** Dùng id client gửi lên (header x-request-id) nếu hợp lệ, không thì tự sinh. */
export function newRequestId(incoming?: string | null): string {
  return incoming && /^[A-Za-z0-9_-]{8,64}$/.test(incoming) ? incoming : randomUUID();
}

/** Chạy fn trong ngữ cảnh một request — mọi log bên trong tự có reqId + fields. */
export function withRequest<T>(reqId: string, fields: Fields, fn: () => Promise<T>): Promise<T> {
  return store.run({ reqId, fields: { ...fields } }, fn);
}

export const currentRequestId = () => store.getStore()?.reqId;

/** Thêm field cho mọi dòng log còn lại của request hiện tại (vd mode=classify). */
export function addLogFields(fields: Fields): void {
  const ctx = store.getStore();
  if (ctx) Object.assign(ctx.fields, fields);
}

/** Cộng dồn số cho request hiện tại (vd tổng chi phí OpenAI) — hiện ở dòng log "request" cuối. */
const totals = new WeakMap<RequestContext, Record<string, number>>();
export function addToRequestTotal(name: string, delta: number): void {
  const ctx = store.getStore();
  if (!ctx) return;
  const t = totals.get(ctx) ?? {};
  t[name] = Math.round(((t[name] ?? 0) + delta) * 1e8) / 1e8;
  totals.set(ctx, t);
}
export const requestTotals = (): Record<string, number> => {
  const ctx = store.getStore();
  return (ctx && totals.get(ctx)) || {};
};

function write(level: Level, msg: string, fields?: Fields): void {
  const ctx = store.getStore();
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    reqId: ctx?.reqId,
    ...ctx?.fields,
    ...fields,
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const log = {
  info: (msg: string, fields?: Fields) => write('info', msg, fields),
  warn: (msg: string, fields?: Fields) => write('warn', msg, fields),
  error: (msg: string, fields?: Fields) => write('error', msg, fields),
};

/** Thông tin lỗi an toàn để log (không kèm stack dài, không kèm body request). */
export function errorFields(err: unknown): Fields {
  if (!(err instanceof Error)) return { error: String(err) };
  const e = err as Error & { status?: unknown; code?: unknown };
  return {
    error: e.message,
    errorName: e.name,
    ...(typeof e.status === 'number' ? { errorStatus: e.status } : {}),
    ...(typeof e.code === 'string' ? { errorCode: e.code } : {}),
  };
}
