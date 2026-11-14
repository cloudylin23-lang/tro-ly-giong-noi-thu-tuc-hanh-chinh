import { log } from './log.js';
import { config, HttpError, openai, recordUsage, withFallback } from './openai.js';

// Gợi ý từ vựng giúp STT nghe đúng thuật ngữ hành chính
const VOCAB_TERMS = [
  'căn cước',
  'căn cước công dân',
  'CCCD',
  'số định danh',
  'tạm trú',
  'thường trú',
  'công an phường',
  'chủ hộ',
  'chủ nhà',
  'hợp đồng thuê nhà',
  'giấy khai sinh',
];
const VOCAB_PROMPT = `Người lớn tuổi nói tiếng Việt về thủ tục hành chính: ${VOCAB_TERMS.join(', ')}.`;

const norm = (s: string) =>
  s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Cụm gợi ý mà người dùng gần như không bao giờ nói ĐỨNG MỘT MÌNH (khác "tạm trú", "thường trú"). */
const ECHO_ALONE = new Set(
  ['căn cước công dân', 'cccd', 'số định danh', 'công an phường', 'chủ nhà', 'hợp đồng thuê nhà', 'giấy khai sinh'].map(norm),
);
/** Câu "ảo" quen thuộc của mô hình STT khi file im lặng / chỉ có tiếng ồn. */
const SILENCE_PHRASES = [
  'cảm ơn các bạn đã theo dõi',
  'cảm ơn các bạn đã xem',
  'hãy subscribe cho kênh',
  'hãy đăng ký kênh',
  'người lớn tuổi nói tiếng việt về thủ tục hành chính',
].map(norm);

/**
 * File không có tiếng nói → mô hình STT hay đọc lại phần gợi ý từ vựng ("căn cước công dân")
 * hoặc bịa câu quen thuộc. Nhận ra các trường hợp đó để trả về rỗng (app sẽ xin nói lại).
 */
export function isLikelySilence(text: string): boolean {
  const t = norm(text);
  if (!t) return true;
  if (ECHO_ALONE.has(t)) return true;
  if (SILENCE_PHRASES.some((p) => t.includes(p))) return true;
  // Chỉ toàn các cụm gợi ý nối nhau (≥ 2 cụm, không còn chữ nào khác) → đang đọc lại prompt
  let rest = ` ${t} `;
  let hits = 0;
  for (const term of [...VOCAB_TERMS].map(norm).sort((a, b) => b.length - a.length)) {
    const re = new RegExp(` ${term} `, 'g');
    const before = rest;
    rest = rest.replace(re, '  ');
    if (rest !== before) hits += (before.match(re) ?? []).length;
  }
  return hits >= 2 && rest.trim() === '';
}

const MAX_BYTES = 10 * 1024 * 1024;

export async function transcribe(file: File): Promise<string> {
  if (file.size === 0) throw new HttpError(400, 'File ghi âm rỗng');
  if (file.size > MAX_BYTES) throw new HttpError(413, 'File ghi âm quá lớn (tối đa 10MB)');
  return withFallback(
    'stt',
    { model: config.sttModel, timeoutMs: config.sttTimeoutMs },
    { model: config.sttFallbackModel, timeoutMs: config.sttFallbackTimeoutMs },
    async (a) => {
      const res = await openai().audio.transcriptions.create(
        { file, model: a.model, language: 'vi', prompt: VOCAB_PROMPT, response_format: 'json' },
        { timeout: a.timeoutMs, maxRetries: 0 },
      );
      recordUsage('stt', a, res.usage);
      const text = res.text.trim();
      if (text && isLikelySilence(text)) {
        log.info('stt.silence', { chars: text.length }); // không log nội dung
        return '';
      }
      return text;
    },
  );
}
