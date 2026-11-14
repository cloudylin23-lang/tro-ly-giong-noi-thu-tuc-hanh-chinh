import { RateLimitError } from 'openai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { llmOutput } from './fake-openai.js';

const fake = vi.hoisted(() => ({ responses: vi.fn(), transcribe: vi.fn() }));
vi.mock('openai', async (orig) => (await import('./fake-openai.js')).fakeOpenAIModule(await orig(), fake));
process.env.OPENAI_API_KEY = 'sk-test';

const { runTurn } = await import('../lib/turn.js');
import type { ClassifyRequest, ExtractRequest } from '../lib/types.js';

const procedures = [
  { id: 'tam_tru', name: 'Đăng ký tạm trú', aliases: ['khai báo tạm trú'] },
  { id: 'cap_lai_can_cuoc', name: 'Cấp lại thẻ căn cước', aliases: ['mất căn cước'] },
];
const classifyReq = (utterance = 'tôi muốn đăng ký tạm trú'): ClassifyRequest => ({
  mode: 'classify',
  utterance,
  procedures,
});
const extractReq = (utterance = 'tôi là trần văn hùng'): ExtractRequest => ({
  mode: 'extract',
  utterance,
  procedureName: 'Đăng ký tạm trú',
  currentField: { key: 'ho_ten', label: 'Họ tên', kind: 'text' },
  otherFields: [
    { key: 'ngay_sinh', label: 'Ngày sinh', kind: 'date' },
    {
      key: 'loai_cho_o',
      label: 'Trường hợp chỗ ở',
      kind: 'choice',
      options: [
        { value: 'nha_minh', label: 'Nhà của bác' },
        { value: 'nha_nguoi_than', label: 'Nhà người thân' },
      ],
    },
  ],
});
const lastCall = () => fake.responses.mock.calls.at(-1)![0];

beforeEach(() => {
  fake.responses.mockReset();
});

describe('runTurn — kiểm tra đầu vào (không gọi OpenAI)', () => {
  it.each([
    ['utterance rỗng', { ...classifyReq(), utterance: '   ' }, 'Thiếu utterance'],
    ['utterance quá dài', { ...classifyReq(), utterance: 'a'.repeat(2001) }, 'utterance quá dài'],
    ['mode lạ', { ...classifyReq(), mode: 'chat' }, 'mode phải là classify hoặc extract'],
    ['classify thiếu procedures', { ...classifyReq(), procedures: [] }, 'Thiếu danh sách procedures'],
    ['extract thiếu currentField', { ...extractReq(), currentField: undefined }, 'Thiếu currentField'],
  ])('%s → 400', async (_name, body, message) => {
    await expect(runTurn(body as never)).rejects.toMatchObject({ status: 400, message });
    expect(fake.responses).not.toHaveBeenCalled();
  });
});

describe('runTurn — classify', () => {
  it('dựng schema strict với enum = id thủ tục + "none"', async () => {
    fake.responses.mockResolvedValue(llmOutput({ procedureId: 'tam_tru', reply: 'Dạ.' }));
    await runTurn(classifyReq());
    const call = lastCall();
    expect(call.text.format).toMatchObject({ type: 'json_schema', strict: true });
    expect(call.text.format.schema.properties.procedureId.enum).toEqual(['tam_tru', 'cap_lai_can_cuoc', 'none']);
    expect(call.store).toBe(false);
    expect(call.input).toContain('tôi muốn đăng ký tạm trú');
  });

  it('trả đúng thủ tục AI chọn', async () => {
    fake.responses.mockResolvedValue(llmOutput({ procedureId: 'tam_tru', reply: 'Con hiểu là tạm trú.' }));
    await expect(runTurn(classifyReq())).resolves.toEqual({ procedureId: 'tam_tru', reply: 'Con hiểu là tạm trú.' });
  });

  it('"none" → procedureId null', async () => {
    fake.responses.mockResolvedValue(llmOutput({ procedureId: 'none', reply: 'Bác nói lại giúp con.' }));
    await expect(runTurn(classifyReq('trời đẹp nhỉ'))).resolves.toMatchObject({ procedureId: null });
  });
});

describe('runTurn — extract', () => {
  it('schema giới hạn key trong các field đang hỏi', async () => {
    fake.responses.mockResolvedValue(llmOutput({ act: 'answer', values: [], reply: '' }));
    await runTurn(extractReq());
    const schema = lastCall().text.format.schema;
    expect(schema.properties.values.items.properties.key.enum).toEqual(['ho_ten', 'ngay_sinh', 'loai_cho_o']);
    expect(schema.properties.act.enum).toEqual(['answer', 'repeat', 'dont_know', 'off_topic']);
  });

  it('mô tả lựa chọn của field choice cho AI', async () => {
    fake.responses.mockResolvedValue(llmOutput({ act: 'answer', values: [], reply: '' }));
    await runTurn(extractReq());
    expect(lastCall().input).toContain('"nha_nguoi_than" = Nhà người thân');
  });

  it('trích nhiều field một lúc, bỏ giá trị rỗng', async () => {
    fake.responses.mockResolvedValue(
      llmOutput({
        act: 'answer',
        values: [
          { key: 'ho_ten', value: 'Trần Văn Hùng' },
          { key: 'ngay_sinh', value: '01/05/1954' },
          { key: 'loai_cho_o', value: '  ' },
        ],
        reply: 'Dạ.',
      }),
    );
    const out = await runTurn(extractReq());
    expect(out).toEqual({
      act: 'answer',
      values: [
        { key: 'ho_ten', value: 'Trần Văn Hùng' },
        { key: 'ngay_sinh', value: '01/05/1954' },
      ],
      reply: 'Dạ.',
    });
  });
});

describe('runTurn — OpenAI lỗi / trả sai', () => {
  it('OpenAI báo lỗi → không trả kết quả bịa', async () => {
    fake.responses.mockRejectedValue(new RateLimitError(429, { message: 'slow down' }, 'slow down', new Headers()));
    await expect(runTurn(classifyReq())).rejects.toBeTruthy();
  });

  it('output không phải JSON → lỗi 502', async () => {
    fake.responses.mockResolvedValue(llmOutput('xin lỗi, tôi không thể'));
    await expect(runTurn(classifyReq())).rejects.toMatchObject({ status: 502 });
  });

  it('classify: procedureId ngoài danh sách → lỗi 502', async () => {
    fake.responses.mockResolvedValue(llmOutput({ procedureId: 'dang_ky_ket_hon', reply: 'Dạ.' }));
    await expect(runTurn(classifyReq())).rejects.toMatchObject({ status: 502 });
  });

  it('extract: thiếu trường / sai kiểu → lỗi 502', async () => {
    fake.responses.mockResolvedValue(llmOutput({ act: 'answer', values: 'Trần Văn Hùng' }));
    await expect(runTurn(extractReq())).rejects.toMatchObject({ status: 502 });
  });

  it('extract: act lạ → lỗi 502', async () => {
    fake.responses.mockResolvedValue(llmOutput({ act: 'chat', values: [], reply: '' }));
    await expect(runTurn(extractReq())).rejects.toMatchObject({ status: 502 });
  });
});
