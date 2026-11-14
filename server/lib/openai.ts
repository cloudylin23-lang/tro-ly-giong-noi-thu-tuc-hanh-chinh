import OpenAI from 'openai';

let client: OpenAI | null = null;

export function openai(): OpenAI {
  if (!process.env.OPENAI_API_KEY) throw new HttpError(500, 'Server chưa có OPENAI_API_KEY');
  // Không retry và timeout ngắn hơn timeout của app (turn 15s, stt 25s):
  // app bỏ cuộc rồi thì server chạy tiếp chỉ tốn tiền.
  client ??= new OpenAI({ timeout: 12_000, maxRetries: 0 });
  return client;
}

export const config = {
  sttModel: process.env.OPENAI_STT_MODEL || 'gpt-4o-transcribe',
  llmModel: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
  reasoningEffort: (process.env.OPENAI_REASONING_EFFORT || undefined) as
    | 'none'
    | 'minimal'
    | 'low'
    | undefined,
};

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Gọi LLM với Structured Outputs, trả về object đã parse. */
export async function structured<T>(opts: {
  name: string;
  schema: Record<string, unknown>;
  instructions: string;
  input: string;
}): Promise<T> {
  const res = await openai().responses.create({
    model: config.llmModel,
    instructions: opts.instructions,
    input: opts.input,
    ...(config.reasoningEffort ? { reasoning: { effort: config.reasoningEffort } } : {}),
    text: {
      format: { type: 'json_schema', name: opts.name, schema: opts.schema, strict: true },
    },
    store: false,
  });
  if (!res.output_text) {
    throw new HttpError(502, `AI không trả kết quả (status: ${res.status ?? 'unknown'})`);
  }
  try {
    return JSON.parse(res.output_text) as T;
  } catch {
    throw new HttpError(502, 'AI trả kết quả không đúng định dạng JSON');
  }
}
