import { InternalServerError } from 'openai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { audioFile } from './fake-openai.js';

const fake = vi.hoisted(() => ({ responses: vi.fn(), transcribe: vi.fn() }));
vi.mock('openai', async (orig) => (await import('./fake-openai.js')).fakeOpenAIModule(await orig(), fake));
process.env.OPENAI_API_KEY = 'sk-test';

const { transcribe } = await import('../lib/stt.js');

beforeEach(() => {
  fake.transcribe.mockReset();
});

describe('transcribe', () => {
  it('file rỗng → 400, không gọi OpenAI', async () => {
    await expect(transcribe(audioFile(0))).rejects.toMatchObject({ status: 400 });
    expect(fake.transcribe).not.toHaveBeenCalled();
  });

  it('file > 10MB → 413, không gọi OpenAI', async () => {
    await expect(transcribe(audioFile(10 * 1024 * 1024 + 1))).rejects.toMatchObject({ status: 413 });
    expect(fake.transcribe).not.toHaveBeenCalled();
  });

  it('gọi STT tiếng Việt kèm gợi ý từ vựng, trả chữ đã trim', async () => {
    fake.transcribe.mockResolvedValue({ text: '  tôi muốn đăng ký tạm trú  ' });
    await expect(transcribe(audioFile())).resolves.toBe('tôi muốn đăng ký tạm trú');
    const args = fake.transcribe.mock.calls[0][0];
    expect(args.language).toBe('vi');
    expect(args.prompt).toContain('tạm trú');
    expect(args.model).toBeTruthy();
  });

  it('OpenAI lỗi liên tục (cả model dự phòng) → 503, không trả chữ rỗng', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    fake.transcribe.mockRejectedValue(new InternalServerError(500, { message: 'boom' }, 'boom', new Headers()));
    await expect(transcribe(audioFile())).rejects.toMatchObject({ status: 503 });
    expect(fake.transcribe).toHaveBeenCalledTimes(2);
  });
});

describe('file im lặng → STT "ảo" bị bỏ', () => {
  it.each([
    'căn cước công dân',
    'Căn cước công dân.',
    'CCCD',
    'số định danh, tạm trú, thường trú',
    'Căn cước, căn cước công dân, CCCD.',
    'Cảm ơn các bạn đã theo dõi!',
    'Người lớn tuổi nói tiếng Việt về thủ tục hành chính',
  ])('bỏ: %s', async (text) => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    fake.transcribe.mockResolvedValue({ text });
    await expect(transcribe(audioFile())).resolves.toBe('');
  });

  it.each([
    'tạm trú',
    'thường trú',
    'mất căn cước công dân rồi',
    'tôi muốn đăng ký tạm trú',
    'chủ hộ là con trai tôi',
    'không không một không năm tư',
  ])('giữ: %s', async (text) => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    fake.transcribe.mockResolvedValue({ text });
    await expect(transcribe(audioFile())).resolves.toBe(text);
  });
});
