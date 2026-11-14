import { config, HttpError, openai, withFallback } from './openai.js';

// Gợi ý từ vựng giúp STT nghe đúng thuật ngữ hành chính
const VOCAB_PROMPT =
  'Người lớn tuổi nói tiếng Việt về thủ tục hành chính: căn cước, căn cước công dân, CCCD, ' +
  'số định danh, tạm trú, thường trú, công an phường, chủ hộ, chủ nhà, hợp đồng thuê nhà, giấy khai sinh.';

const MAX_BYTES = 10 * 1024 * 1024;

export async function transcribe(file: File): Promise<string> {
  if (file.size === 0) throw new HttpError(400, 'File ghi âm rỗng');
  if (file.size > MAX_BYTES) throw new HttpError(413, 'File ghi âm quá lớn (tối đa 10MB)');
  return withFallback(
    'stt',
    { model: config.sttModel, timeoutMs: config.sttTimeoutMs },
    { model: config.sttFallbackModel, timeoutMs: config.sttFallbackTimeoutMs },
    async ({ model, timeoutMs }) => {
      const res = await openai().audio.transcriptions.create(
        { file, model, language: 'vi', prompt: VOCAB_PROMPT, response_format: 'json' },
        { timeout: timeoutMs, maxRetries: 0 },
      );
      return res.text.trim();
    },
  );
}
