import { handler, json } from '../lib/http.js';
import { HttpError } from '../lib/openai.js';
import { runTurn } from '../lib/turn.js';
import type { TurnRequest } from '../lib/types.js';

// POST JSON { mode: "classify" | "extract", ... } → JSON theo schema
export default handler(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Dùng POST');
  let body: TurnRequest;
  try {
    body = (await req.json()) as TurnRequest;
  } catch {
    throw new HttpError(400, 'Body phải là JSON');
  }
  return json(await runTurn(body));
});
