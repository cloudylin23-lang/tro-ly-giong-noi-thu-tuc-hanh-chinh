// State machine của luồng hỏi đáp. CODE nắm luồng, AI chỉ trích dữ liệu.
import { copy } from '@/copy';
import type { ExtractResponse, Field, Procedure, Session } from '@/types';
import { check, speakable } from './validate';

export function newSession(procedureId: string): Session {
  return { procedureId, filled: {}, skipped: [], updatedAt: Date.now() };
}

const isDone = (s: Session, f: Field) => f.key in s.filled || s.skipped.includes(f.key);

/** Các field cần hỏi với phiên này: bỏ field có điều kiện `when` chưa thoả (vd ở nhà mình thì không hỏi chủ nhà) */
export function activeFields(p: Procedure, s: Session): Field[] {
  return p.fields.filter((f) => !f.when || f.when.in.includes(s.filled[f.when.field] ?? ''));
}

/** Field cần hỏi tiếp theo (theo thứ tự trong file cấu hình), undefined = xong */
export function nextField(p: Procedure, s: Session): Field | undefined {
  return activeFields(p, s).find((f) => !isDone(s, f));
}

export function remainingFields(p: Procedure, s: Session, exceptKey?: string): Field[] {
  return activeFields(p, s).filter((f) => !isDone(s, f) && f.key !== exceptKey);
}

export function progress(p: Procedure, s: Session) {
  const fields = activeFields(p, s);
  const done = fields.filter((f) => isDone(s, f)).length;
  return { current: Math.min(done + 1, fields.length), total: fields.length, done };
}

/** Giấy tờ chung + giấy tờ riêng theo trường hợp bác đã chọn */
export function documentsFor(p: Procedure, s: Session): string[] {
  const extra = activeFields(p, s).flatMap((f) =>
    f.kind === 'choice' ? (f.options?.find((o) => o.value === s.filled[f.key])?.documents ?? []) : [],
  );
  return [...p.documents, ...extra];
}

export function isComplete(p: Procedure, s: Session) {
  return !nextField(p, s);
}

export interface ApplyResult {
  session: Session;
  /** Câu xác nhận / báo lỗi ngắn (có thể rỗng) */
  reply: string;
  /** Field hỏi tiếp theo; undefined = đã xong */
  next: Field | undefined;
}

/** Câu hỏi kèm hướng dẫn cho mục không bắt buộc, dùng cả khi đọc và hiển thị. */
export function questionText(field: Field): string {
  return [field.question, field.optional ? copy.ask.optionalHint : ''].filter(Boolean).join(' ');
}

/** Câu app sẽ đọc: xác nhận + câu hỏi tiếp theo */
export function sayAfter(r: ApplyResult): string {
  return [r.reply, r.next ? questionText(r.next) : ''].filter(Boolean).join(' ').trim();
}

/** Áp kết quả AI vào phiên, kiểm tra hợp lệ, quyết định câu nói tiếp theo. */
export function applyTurn(p: Procedure, s: Session, current: Field, res: ExtractResponse): ApplyResult {
  let session: Session = { ...s, filled: { ...s.filled }, skipped: [...s.skipped], updatedAt: Date.now() };
  let currentError: string | null = null;
  let currentAccepted = false;

  if (res.act === 'answer') {
    for (const { key, value } of res.values) {
      const field = p.fields.find((f) => f.key === key);
      if (!field) continue;
      const c = check(field, value);
      if (c.ok) {
        session.filled[key] = c.value;
        session.skipped = session.skipped.filter((k) => k !== key);
        if (key === current.key) currentAccepted = true;
      } else if (key === current.key) {
        currentError = c.reason;
      }
    }
  } else if (res.act === 'dont_know') {
    session = skip(session, current.key);
  }

  const next = nextField(p, session);

  if (currentError) {
    return { session, reply: `${copy.ask.invalidPrefix} ${currentError}`, next };
  }
  if (res.act === 'answer' && !currentAccepted && res.values.length === 0) {
    // AI nói là trả lời nhưng không trích được gì
    return { session, reply: copy.ask.invalidPrefix, next };
  }
  if (res.act === 'repeat') {
    return { session, reply: '', next };
  }
  return { session, reply: res.reply, next };
}

export function skip(s: Session, key: string): Session {
  return { ...s, skipped: [...new Set([...s.skipped, key])], updatedAt: Date.now() };
}

/** Xoá một field để hỏi lại (người dùng bấm "sửa") */
export function reopen(s: Session, key: string): Session {
  const filled = { ...s.filled };
  delete filled[key];
  return { ...s, filled, skipped: s.skipped.filter((k) => k !== key), updatedAt: Date.now() };
}

/** Bản tóm tắt để đọc to ở màn kết quả */
export function summaryText(p: Procedure, s: Session): string {
  const lines = activeFields(p, s).map((f) => {
    const v = s.filled[f.key];
    return v
      ? `${f.label}: ${speakable(f, v)}.`
      : `${f.label}: ${f.optional && s.skipped.includes(f.key) ? copy.ask.optionalEmpty : 'chưa có'}.`;
  });
  return lines.join(' ');
}
