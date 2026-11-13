import type { FieldKind } from '@/types';

export type Checked = { ok: true; value: string } | { ok: false; reason: string };

/** Chuẩn hoá + kiểm tra giá trị AI trích ra. Code quyết định, không tin hoàn toàn vào AI. */
export function check(kind: FieldKind, raw: string): Checked {
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
        return { ok: false, reason: `Số căn cước cần đủ 12 số, con mới nghe được ${digits.length} số.` };
      }
      return { ok: true, value: digits };
    }

    case 'phone': {
      let digits = v.replace(/\D/g, '');
      if (digits.startsWith('84')) digits = `0${digits.slice(2)}`;
      if (!/^0\d{9,10}$/.test(digits)) return { ok: false, reason: 'Số điện thoại cần 10 số, bắt đầu bằng số 0.' };
      return { ok: true, value: digits };
    }

    case 'gender': {
      const s = v.toLowerCase();
      if (/(nữ|nu\b|đàn bà|female|gái)/.test(s)) return { ok: true, value: 'Nữ' };
      if (/(nam|đàn ông|male|trai)/.test(s)) return { ok: true, value: 'Nam' };
      return { ok: false, reason: 'Bác là nam hay nữ ạ?' };
    }
  }
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Cách đọc to một giá trị cho TTS nghe rõ (số đọc từng chữ số, ngày đọc đầy đủ). */
export function speakable(kind: FieldKind, value: string): string {
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
export function displayable(kind: FieldKind, value: string): string {
  if (kind === 'id12') return value.match(/.{1,3}/g)?.join(' ') ?? value;
  if (kind === 'phone') return `${value.slice(0, 4)} ${value.slice(4, 7)} ${value.slice(7)}`;
  return value;
}
