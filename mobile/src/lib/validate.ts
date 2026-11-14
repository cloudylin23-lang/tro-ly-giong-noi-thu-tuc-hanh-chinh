import type { Field } from '@/types';

/** Phần của Field cần để kiểm tra / hiển thị giá trị */
export type FieldShape = Pick<Field, 'kind' | 'options'>;

export type Checked = { ok: true; value: string } | { ok: false; reason: string };

/** Chuẩn hoá + kiểm tra giá trị AI trích ra. Code quyết định, không tin hoàn toàn vào AI. */
export function check(field: FieldShape, raw: string): Checked {
  const { kind } = field;
  const v = raw.trim().replace(/\s+/g, ' ');
  if (!v) return { ok: false, reason: 'Con chưa nghe thấy thông tin.' };

  switch (kind) {
    case 'text':
      return v.length <= 200 ? { ok: true, value: v } : { ok: false, reason: 'Thông tin dài quá.' };

    case 'date': {
      const m = v.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
      if (!m) return { ok: false, reason: 'Con cần đủ ngày, tháng và năm sinh.' };
      const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
      const date = new Date(y, mo - 1, d);
      const valid =
        date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d && y >= 1900 && date <= new Date();
      if (!valid) return { ok: false, reason: 'Ngày sinh này chưa đúng.' };
      return { ok: true, value: `${pad(d)}/${pad(mo)}/${y}` };
    }

    case 'id12': {
      const digits = v.replace(/\D/g, '');
      if (digits.length !== 12) {
        return { ok: false, reason: `Số căn cước cần đúng 12 số, con nghe được ${digits.length} số. Bác đọc lại chậm từng số giúp con nhé.` };
      }
      return { ok: true, value: digits };
    }

    case 'phone': {
      let digits = v.replace(/\D/g, '');
      if (digits.startsWith('84')) digits = `0${digits.slice(2)}`;
      if (!/^0\d{9}$/.test(digits)) return { ok: false, reason: 'Số điện thoại cần 10 số, bắt đầu bằng số 0.' };
      return { ok: true, value: digits };
    }

    case 'gender': {
      const s = v.toLowerCase();
      if (/(nữ|nu\b|đàn bà|female|gái)/.test(s)) return { ok: true, value: 'Nữ' };
      if (/(nam|đàn ông|male|trai)/.test(s)) return { ok: true, value: 'Nam' };
      return { ok: false, reason: 'Bác là nam hay nữ ạ?' };
    }

    case 'email': {
      const e = v.replace(/\s+/g, '').toLowerCase();
      return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(e) ? { ok: true, value: e } : { ok: false, reason: 'Địa chỉ email này chưa đúng.' };
    }

    case 'choice': {
      // AI phải trả về đúng value; chấp nhận cả khi trả về nhãn
      const s = fold(v);
      const opt = field.options?.find((o) => fold(o.value) === s || fold(o.label) === s);
      return opt ? { ok: true, value: opt.value } : { ok: false, reason: 'Con chưa rõ bác thuộc trường hợp nào.' };
    }
  }
}

const pad = (n: number) => String(n).padStart(2, '0');
const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();
const optionLabel = (field: FieldShape, value: string) => field.options?.find((o) => o.value === value)?.label ?? value;

// Từ chỉ MỘT chữ số, so khớp ĐÚNG DẤU: "bà", "Nam", "tạm", "sau", "từ", "Lê" không phải chữ số.
// AI hay đọc nhầm "năm tám" thành 85 nên dãy số do code tự đổi.
const DIGIT_WORDS: Record<string, string> = {
  không: '0', linh: '0', lẻ: '0',
  một: '1', mốt: '1',
  hai: '2', ba: '3', bốn: '4', tư: '4',
  năm: '5', lăm: '5', sáu: '6', bảy: '7', bẩy: '7', tám: '8', chín: '9',
};
// Cả câu gõ không dấu thì mới nhận dạng chữ số không dấu
const DIGIT_WORDS_PLAIN: Record<string, string> = {
  khong: '0', mot: '1', hai: '2', ba: '3', bon: '4', nam: '5', sau: '6', bay: '7', tam: '8', chin: '9',
};
// Có các từ này nghĩa là đọc kiểu "mười hai", "một trăm" → không tự đổi được, để AI lo
const NUMBER_WORDS = new Set(['muoi', 'tram', 'nghin', 'ngan', 'trieu']);

/**
 * Lấy dãy chữ số từ câu nói, mỗi từ chỉ số = đúng một chữ số.
 * Chỉ lấy đoạn chữ số LIỀN NHAU dài nhất, để "Không, số của tôi là 0912…" không dính thêm số 0 ở đầu.
 * "số tôi là không chín tám, một hai ba" → "098123". Trả null nếu không chắc chắn.
 */
export function digitsFromSpeech(text: string): string | null {
  const lower = text.toLowerCase().normalize('NFC');
  const words = fold(lower) === lower.trim() ? DIGIT_WORDS_PLAIN : DIGIT_WORDS;
  let best = '';
  let run = '';
  for (const raw of lower.split(/[^\p{L}\p{N}]+/u)) {
    if (!raw) continue;
    if (NUMBER_WORDS.has(fold(raw))) return null;
    const d = /^\d+$/.test(raw) ? raw : words[raw];
    if (d) {
      run += d;
      if (run.length > best.length) best = run;
    } else {
      run = '';
    }
  }
  return best.length >= 6 ? best : null;
}

export const MASKED_NUMBER = '[dãy số đã ẩn]';

/**
 * Che các dãy số dài (≥ minDigits chữ số, đọc bằng chữ hoặc viết số) trước khi gửi câu nói cho AI —
 * số căn cước / số điện thoại không cần đi qua AI vì code đã tự đổi được.
 * "tôi là Hùng, số căn cước không không một …" → "tôi là Hùng, số căn cước [dãy số đã ẩn]"
 */
export function maskLongDigitRuns(text: string, minDigits = 9): string {
  const lower = text.toLowerCase().normalize('NFC');
  const words = fold(lower) === lower.trim() ? DIGIT_WORDS_PLAIN : DIGIT_WORDS;
  // Tách giữ nguyên dấu cách / dấu câu: [từ, ngăn cách, từ, ngăn cách, …]
  const parts = text.normalize('NFC').split(/([^\p{L}\p{N}]+)/u);
  const digitsOf = (part: string) => {
    const p = part.toLowerCase();
    return /^\d+$/.test(p) ? p.length : words[p] ? 1 : 0;
  };
  const out: string[] = [];
  let i = 0;
  while (i < parts.length) {
    if (i % 2 === 0 && digitsOf(parts[i]) > 0) {
      // gom một đoạn từ chỉ số liền nhau (chỉ cách nhau bởi dấu cách / dấu câu)
      let j = i;
      let count = 0;
      while (j < parts.length && digitsOf(parts[j]) > 0) {
        count += digitsOf(parts[j]);
        j += 2;
      }
      const end = j - 2; // chỉ số của từ chỉ số cuối cùng trong đoạn
      if (count >= minDigits) {
        out.push(MASKED_NUMBER);
      } else {
        out.push(parts.slice(i, end + 1).join(''));
      }
      if (end + 1 < parts.length) out.push(parts[end + 1]); // ngăn cách sau đoạn
      i = end + 2;
    } else {
      out.push(parts[i]);
      i++;
    }
  }
  return out.join('');
}

/** Cách đọc to một giá trị cho TTS nghe rõ (số đọc từng chữ số, ngày đọc đầy đủ). */
export function speakable(field: FieldShape, value: string): string {
  const { kind } = field;
  if (kind === 'choice') return optionLabel(field, value);
  if (kind === 'id12' || kind === 'phone') {
    const groups = kind === 'phone' ? [value.slice(0, 4), value.slice(4, 7), value.slice(7)] : value.match(/.{1,3}/g) ?? [];
    return groups.map((g) => g.split('').join(' ')).join(', ');
  }
  if (kind === 'date') {
    const [d, m, y] = value.split('/');
    return `ngày ${Number(d)} tháng ${Number(m)} năm ${y}`;
  }
  return value;
}

/** Cách hiển thị trên màn hình */
export function displayable(field: FieldShape, value: string): string {
  const { kind } = field;
  if (kind === 'choice') return optionLabel(field, value);
  if (kind === 'id12') return value.match(/.{1,3}/g)?.join(' ') ?? value;
  if (kind === 'phone') return `${value.slice(0, 4)} ${value.slice(4, 7)} ${value.slice(7)}`;
  return value;
}
