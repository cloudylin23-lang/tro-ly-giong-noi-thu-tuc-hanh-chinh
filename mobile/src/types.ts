// Kiểu dữ liệu dùng chung trong app.
// Phần Request/Response phải khớp với server/lib/types.ts.

export type FieldKind = 'text' | 'date' | 'id12' | 'phone' | 'gender' | 'email' | 'choice';

/** Một lựa chọn của field kind=choice. Giấy tờ riêng của trường hợp này (nếu có). */
export interface FieldOption {
  value: string;
  label: string;
  documents?: string[];
}

export interface Field {
  key: string;
  label: string;
  kind: FieldKind;
  question: string; // câu app đọc để hỏi
  hint?: string; // gợi ý cho AI
  options?: FieldOption[]; // bắt buộc khi kind=choice
  /** Chỉ hỏi field này khi field khác đã chọn một trong các giá trị */
  when?: { field: string; in: string[] };
}

export interface Procedure {
  id: string;
  name: string;
  aliases: string[];
  /** Mẫu tờ khai chính thức để dựng PDF đúng bố cục (không có thì dùng bảng chung) */
  form?: 'CT01';
  formTitle: string;
  fields: Field[];
  /** Giấy tờ chung cho mọi trường hợp; giấy tờ riêng nằm trong options của field choice */
  documents: string[];
  office: {
    name: string;
    address: string;
    hours: string;
    processing?: string; // thời hạn giải quyết
    fee?: string; // lệ phí
    note?: string;
  };
  source: string;
  sourceUrls?: string[];
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
  options?: { value: string; label: string }[];
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
