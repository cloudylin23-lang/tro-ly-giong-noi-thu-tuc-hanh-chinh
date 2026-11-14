import { config, configProblems } from '../lib/config.js';
import { handler, json } from '../lib/http.js';

export default handler(async () =>
  json({
    ok: configProblems.length === 0,
    // Chỉ nêu biến nào thiếu/sai, không bao giờ trả giá trị
    ...(configProblems.length ? { problems: configProblems } : {}),
    time: new Date().toISOString(),
    hasKey: Boolean(config.openaiApiKey),
    sttModel: config.sttModel,
    llmModel: config.llmModel,
    sttFallbackModel: config.sttFallbackModel,
    llmFallbackModel: config.llmFallbackModel,
  }),
);
