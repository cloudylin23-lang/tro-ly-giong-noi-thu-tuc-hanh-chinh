import OpenAI from 'openai';

let client: OpenAI | null = null;

export function openai(): OpenAI {
  if (!process.env.OPENAI_API_KEY) throw new HttpError(500, 'Server chưa có OPENAI_API_KEY');
  client ??= new OpenAI({ timeout: 20_000, maxRetries: 1 });
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

/** Gọi LLM với Structured Outputs, trả về object đã parse và đã kiểm tra. */
export async function structured<T>(opts: {
  name: string;
  schema: Record<string, unknown>;
  instructions: string;
  input: string;
  /** Kiểm tra lại kết quả ở runtime — không tin tuyệt đối vào strict schema */
  validate?: (data: unknown) => data is T;
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
  return parseOutput(res.output_text, opts.validate);
}

export function parseOutput<T>(text: string, validate?: (data: unknown) => data is T): T {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new HttpError(502, 'AI trả kết quả không phải JSON');
  }
  if (validate && !validate(data)) throw new HttpError(502, 'AI trả kết quả không đúng định dạng');
  return data as T;
}
