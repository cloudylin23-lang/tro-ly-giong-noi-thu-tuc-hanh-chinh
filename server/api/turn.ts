import { handler, json } from '../lib/http.js';
import { addLogFields, log } from '../lib/log.js';
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
  addLogFields({ mode: body?.mode });
  log.info('turn.input', { utteranceChars: typeof body?.utterance === 'string' ? body.utterance.length : 0 });
  const out = await runTurn(body);
  if ('act' in out) log.info('turn.extract', { act: out.act, keys: out.values.map((v) => v.key) });
  else log.info('turn.classify', { procedureId: out.procedureId });
  return json(out);
});
