// Kiểu dữ liệu dùng chung trong app.
// Phần Request/Response phải khớp với server/lib/types.ts.

export type FieldKind = 'text' | 'date' | 'id12' | 'phone' | 'gender';

export interface Field {
  key: string;
  label: string;
  kind: FieldKind;
  question: string; // câu app đọc để hỏi
  hint?: string; // gợi ý cho AI
}

export interface Procedure {
  id: string;
  name: string;
  aliases: string[];
  formTitle: string;
  fields: Field[];
  documents: string[];
  office: { name: string; address: string; hours: string; note?: string };
  source: string;
}

export type Filled = Record<string, string>;

export interface Session {
  procedureId: string;
  filled: Filled;
  skipped: string[]; // field bác không nhớ / bỏ qua
  updatedAt: number;
}

// ---- API ----
export interface FieldSpec {
  key: string;
  label: string;
  kind: FieldKind;
  hint?: string;
}

export interface ClassifyResponse {
  procedureId: string | null;
  reply: string;
}

export type UserAct = 'answer' | 'repeat' | 'dont_know' | 'off_topic';

export interface ExtractResponse {
  act: UserAct;
  values: { key: string; value: string }[];
  reply: string;
}
