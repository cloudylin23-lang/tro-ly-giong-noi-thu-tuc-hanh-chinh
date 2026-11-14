import { describe, expect, it } from 'vitest';
import { loadConfig } from '../lib/config.js';

describe('loadConfig', () => {
  it('thiếu OPENAI_API_KEY → báo lỗi rõ ràng', () => {
    const { problems } = loadConfig({});
    expect(problems).toEqual(['OPENAI_API_KEY chưa được đặt (bắt buộc)']);
  });

  it('chỉ có key → dùng mặc định cho mọi thứ khác', () => {
    const { config, problems } = loadConfig({ OPENAI_API_KEY: 'sk-x' });
    expect(problems).toEqual([]);
    expect(config).toMatchObject({
      openaiApiKey: 'sk-x',
      appToken: '',
      sttModel: 'gpt-4o-transcribe',
      sttFallbackModel: 'gpt-4o-mini-transcribe',
      llmModel: 'gpt-4.1-mini',
      llmFallbackModel: 'gpt-4o-mini',
      reasoningEffort: undefined,
      llmTimeoutMs: 8_000,
      sttTimeoutMs: 13_000,
    });
  });

  it('đọc giá trị từ env, bỏ khoảng trắng thừa', () => {
    const { config } = loadConfig({
      OPENAI_API_KEY: ' sk-x ',
      OPENAI_MODEL: 'gpt-5.4-mini',
      OPENAI_REASONING_EFFORT: 'low',
      OPENAI_STT_TIMEOUT_MS: '25000',
      APP_TOKEN: 'abc',
    });
    expect(config).toMatchObject({
      openaiApiKey: 'sk-x',
      llmModel: 'gpt-5.4-mini',
      reasoningEffort: 'low',
      sttTimeoutMs: 25_000,
      appToken: 'abc',
    });
  });

  it('giá trị sai → liệt kê đủ từng lỗi, dùng mặc định thay thế', () => {
    const { config, problems } = loadConfig({
      OPENAI_API_KEY: 'sk-x',
      OPENAI_REASONING_EFFORT: 'max',
      OPENAI_LLM_TIMEOUT_MS: 'mười giây',
      OPENAI_STT_TIMEOUT_MS: '500',
    });
    expect(problems).toHaveLength(3);
    expect(problems.join('\n')).toMatch(/OPENAI_REASONING_EFFORT/);
    expect(problems.join('\n')).toMatch(/OPENAI_LLM_TIMEOUT_MS/);
    expect(problems.join('\n')).toMatch(/OPENAI_STT_TIMEOUT_MS/);
    expect(config.llmTimeoutMs).toBe(8_000);
    expect(config.reasoningEffort).toBeUndefined();
  });

  it('không bao giờ đưa giá trị key vào thông báo lỗi', () => {
    const { problems } = loadConfig({ OPENAI_API_KEY: 'sk-secret', OPENAI_REASONING_EFFORT: 'x' });
    expect(problems.join(' ')).not.toContain('sk-secret');
  });
});
