import { handler, json } from '../lib/http.js';
import { config } from '../lib/openai.js';

export default handler(async () =>
  json({
    ok: true,
    time: new Date().toISOString(),
    hasKey: Boolean(process.env.OPENAI_API_KEY),
    sttModel: config.sttModel,
    llmModel: config.llmModel,
  }),
);
