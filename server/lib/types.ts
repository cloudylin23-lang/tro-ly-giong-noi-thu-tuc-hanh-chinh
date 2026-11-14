// Giữ đồng bộ với mobile/src/types.ts (phần request/response)

export type FieldKind = 'text' | 'date' | 'id12' | 'phone' | 'gender' | 'email' | 'choice';

export interface FieldSpec {
  key: string;
  label: string; // tên hiển thị, vd "Ngày sinh"
  kind: FieldKind;
  hint?: string; // gợi ý cho AI, vd "ghi cả số nhà, đường, phường"
  options?: { value: string; label: string }[]; // kind=choice: AI phải trả về đúng một value
}

export interface ProcedureBrief {
  id: string;
  name: string;
  aliases: string[]; // các cách người dân hay gọi
}

export interface ClassifyRequest {
  mode: 'classify';
  utterance: string;
  procedures: ProcedureBrief[];
}

export interface ClassifyResponse {
  procedureId: string | null; // null = không khớp thủ tục nào
  reply: string; // câu nói lại với người dùng
}

export interface ExtractRequest {
  mode: 'extract';
  utterance: string;
  procedureName: string;
  currentField: FieldSpec; // field app đang hỏi
  otherFields: FieldSpec[]; // các field chưa có, người dùng có thể nói luôn
}

export type UserAct = 'answer' | 'repeat' | 'dont_know' | 'off_topic';

export interface ExtractResponse {
  act: UserAct;
  values: { key: string; value: string }[];
  reply: string; // câu xác nhận ngắn / xin nói lại
}

export type TurnRequest = ClassifyRequest | ExtractRequest;
export type TurnResponse = ClassifyResponse | ExtractResponse;
