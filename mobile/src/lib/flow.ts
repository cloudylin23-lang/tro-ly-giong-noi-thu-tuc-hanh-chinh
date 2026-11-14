// State machine của luồng hỏi đáp. CODE nắm luồng, AI chỉ trích dữ liệu.
import { copy } from '@/copy';
import type { ExtractResponse, Field, Procedure, Session } from '@/types';
import { check, digitsFromSpeech, displayable, speakable } from './validate';

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

/** Câu app sẽ đọc: xác nhận + câu hỏi tiếp theo */
export function sayAfter(r: ApplyResult): string {
  return [r.reply, r.next?.question].filter(Boolean).join(' ').trim();
}

/**
 * Đang hỏi số căn cước / số điện thoại mà câu nói có dãy số → code tự xử lý, KHÔNG gọi AI.
 * Lợi: số định danh không đi qua AI (dữ liệu cá nhân), nhanh hơn ~1 giây, không bị AI đọc sai số.
 * Trả null khi cần AI hiểu ý (vd "tôi không nhớ", "hả con nói gì").
 */
export function localNumberTurn(current: Field, utterance: string): ExtractResponse | null {
  if (current.kind !== 'id12' && current.kind !== 'phone') return null;
  const digits = digitsFromSpeech(utterance);
  return digits ? { act: 'answer', values: [{ key: current.key, value: digits }], reply: '' } : null;
}

/** Áp kết quả AI vào phiên, kiểm tra hợp lệ, quyết định câu nói tiếp theo. */
export function applyTurn(
  p: Procedure,
  s: Session,
  current: Field,
  res: ExtractResponse,
  /** Câu bác nói (sau STT) — dùng để code tự đổi dãy số, không tin AI ở phần này */
  utterance?: string,
): ApplyResult {
  let session: Session = { ...s, filled: { ...s.filled }, skipped: [...s.skipped], updatedAt: Date.now() };
  let currentError: string | null = null;
  let currentAccepted = false;
  let otherRejected = false;

  if (res.act === 'answer') {
    let values = res.values;
    if ((current.kind === 'id12' || current.kind === 'phone') && utterance) {
      const spoken = digitsFromSpeech(utterance);
      if (spoken) values = [...values.filter((v) => v.key !== current.key), { key: current.key, value: spoken }];
    }
    for (const { key, value } of values) {
      const field = p.fields.find((f) => f.key === key);
      if (!field) continue;
      const c = check(field, value);
      if (c.ok) {
        session.filled[key] = c.value;
        session.skipped = session.skipped.filter((k) => k !== key);
        if (key === current.key) currentAccepted = true;
      } else if (key === current.key) {
        currentError = c.reason;
      } else {
        otherRejected = true;
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
  if (currentAccepted && (current.kind === 'id12' || current.kind === 'phone')) {
    // Dãy số: code tự đọc từng chữ số cho chắc, không dùng câu AI viết (TTS hay đọc "1800" thành "một nghìn tám trăm")
    return { session, reply: copy.ask.confirmNumber(current.label, speakable(current, session.filled[current.key])), next };
  }
  if (otherRejected) {
    // Câu AI có thể nhắc lại cả giá trị vừa bị loại → code tự xác nhận đúng mục đã ghi
    return {
      session,
      reply: currentAccepted ? copy.ask.confirmValue(current.label, speakable(current, session.filled[current.key])) : '',
      next,
    };
  }
  return { session, reply: res.reply, next };
}

export function skip(s: Session, key: string): Session {
  return { ...s, skipped: [...new Set([...s.skipped, key])], updatedAt: Date.now() };
}

/**
 * Xoá một field để hỏi lại (người dùng bấm "sửa").
 * Field nào chỉ hỏi theo field này (`when`) cũng bị xoá, để đổi trường hợp thì hỏi lại từ đầu.
 */
export function reopen(p: Procedure, s: Session, key: string): Session {
  const drop = new Set([key]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const f of p.fields) {
      if (f.when && drop.has(f.when.field) && !drop.has(f.key)) {
        drop.add(f.key);
        grew = true;
      }
    }
  }
  const filled = { ...s.filled };
  for (const k of drop) delete filled[k];
  return { ...s, filled, skipped: s.skipped.filter((k) => !drop.has(k)), updatedAt: Date.now() };
}

/** Bản tóm tắt để đọc to ở màn kết quả */
export function summaryText(p: Procedure, s: Session): string {
  const lines = activeFields(p, s).map((f) => {
    const v = s.filled[f.key];
    return v ? `${f.label}: ${speakable(f, v)}.` : `${f.label}: chưa có.`;
  });
  return lines.join(' ');
}

// ---- Màn kết quả / chế độ quầy ----

/** Các dòng cho chế độ quầy: chỉ mục đã có giá trị, đúng thứ tự field trong JSON (= thứ tự trên mẫu CT01/DC02) */
export function counterRows(p: Procedure, s: Session): { label: string; value: string }[] {
  return activeFields(p, s).flatMap((f) => {
    const v = s.filled[f.key];
    return v ? [{ label: f.label, value: displayable(f, v) }] : [];
  });
}

/** Tick / bỏ tick một giấy tờ đã chuẩn bị */
export function toggleDoc(s: Session, doc: string): Session {
  const cur = s.checkedDocs ?? [];
  const checkedDocs = cur.includes(doc) ? cur.filter((d) => d !== doc) : [...cur, doc];
  return { ...s, checkedDocs, updatedAt: Date.now() };
}

/** Link Google Maps tìm nơi nộp; null nếu thủ tục chưa có `office.mapsQuery` */
export function mapsUrl(p: Procedure): string | null {
  const q = p.office.mapsQuery?.trim();
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}

/** Tuổi tròn tính từ ngày sinh "dd/mm/yyyy" (đã qua validate); null nếu không đọc được */
export function ageFrom(dob: string | undefined, today = new Date()): number | null {
  const m = dob?.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const hadBirthday = today.getMonth() + 1 > mo || (today.getMonth() + 1 === mo && today.getDate() >= d);
  return today.getFullYear() - y - (hadBirthday ? 0 : 1);
}

/** Câu "Bác được miễn lệ phí" nếu đủ tuổi theo `feeExemption`; null nếu không áp dụng */
export function feeExemptText(p: Procedure, s: Session, today = new Date()): string | null {
  if (!p.feeExemption) return null;
  const age = ageFrom(s.filled.ngay_sinh, today);
  return age !== null && age >= p.feeExemption.minAge ? p.feeExemption.text : null;
}
