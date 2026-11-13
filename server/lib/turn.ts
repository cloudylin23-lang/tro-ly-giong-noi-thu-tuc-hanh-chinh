import { CLASSIFY_INSTRUCTIONS } from '../prompts/classify.js';
import { EXTRACT_INSTRUCTIONS } from '../prompts/extract.js';
import { HttpError, structured } from './openai.js';
import type {
  ClassifyRequest,
  ClassifyResponse,
  ExtractRequest,
  ExtractResponse,
  FieldSpec,
  TurnRequest,
  TurnResponse,
} from './types.js';

export async function runTurn(body: TurnRequest): Promise<TurnResponse> {
  if (!body || typeof body.utterance !== 'string' || !body.utterance.trim()) {
    throw new HttpError(400, 'Thiếu utterance');
  }
  if (body.utterance.length > 2000) throw new HttpError(400, 'utterance quá dài');
  if (body.mode === 'classify') return classify(body);
  if (body.mode === 'extract') return extract(body);
  throw new HttpError(400, 'mode phải là classify hoặc extract');
}

async function classify(req: ClassifyRequest): Promise<ClassifyResponse> {
  if (!Array.isArray(req.procedures) || req.procedures.length === 0) {
    throw new HttpError(400, 'Thiếu danh sách procedures');
  }
  const ids = req.procedures.map((p) => p.id);
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      procedureId: { type: 'string', enum: [...ids, 'none'] },
      reply: { type: 'string' },
    },
    required: ['procedureId', 'reply'],
  };
  const input = [
    'Danh sách thủ tục:',
    ...req.procedures.map((p) => `- id="${p.id}": ${p.name} (hay gọi: ${p.aliases.join('; ')})`),
    '',
    `Người dùng nói: "${req.utterance.trim()}"`,
  ].join('\n');

  const out = await structured<{ procedureId: string; reply: string }>({
    name: 'classify_procedure',
    schema,
    instructions: CLASSIFY_INSTRUCTIONS,
    input,
  });
  return { procedureId: out.procedureId === 'none' ? null : out.procedureId, reply: out.reply };
}

async function extract(req: ExtractRequest): Promise<ExtractResponse> {
  if (!req.currentField?.key) throw new HttpError(400, 'Thiếu currentField');
  const fields = [req.currentField, ...(req.otherFields ?? [])];
  const keys = [...new Set(fields.map((f) => f.key))];
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      act: { type: 'string', enum: ['answer', 'repeat', 'dont_know', 'off_topic'] },
      values: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            key: { type: 'string', enum: keys },
            value: { type: 'string' },
          },
          required: ['key', 'value'],
        },
      },
      reply: { type: 'string' },
    },
    required: ['act', 'values', 'reply'],
  };
  const describe = (f: FieldSpec) =>
    `- key="${f.key}" | ${f.label} | kind=${f.kind}${f.hint ? ` | ${f.hint}` : ''}`;
  const input = [
    `Thủ tục: ${req.procedureName}`,
    'currentField (đang hỏi):',
    describe(req.currentField),
    'otherFields (chưa có, người dùng có thể nói luôn):',
    ...(req.otherFields?.length ? req.otherFields.map(describe) : ['(không còn)']),
    '',
    `Người dùng trả lời: "${req.utterance.trim()}"`,
  ].join('\n');

  const out = await structured<ExtractResponse>({
    name: 'extract_fields',
    schema,
    instructions: EXTRACT_INSTRUCTIONS,
    input,
  });
  // Bỏ giá trị rỗng, chỉ giữ key hợp lệ
  out.values = out.values.filter((v) => keys.includes(v.key) && v.value.trim() !== '');
  return out;
}
