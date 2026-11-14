// "Gửi cho con cháu nộp giúp": soạn tin nhắn + gửi PDF tờ khai.
// expo-sharing chỉ gửi được tệp, không kèm chữ (Share của RN thì ngược lại trên Android),
// nên chép tin nhắn vào bộ nhớ tạm trước, rồi mở bảng chia sẻ PDF; bác dán tin nhắn vào Zalo.
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { copy } from '@/copy';
import type { Procedure, Session } from '@/types';
import { documentsFor, feeExemptText } from './flow';
import { makeFormPdf } from './pdf';

/** Tin nhắn gửi con cháu. Không chứa số căn cước / số điện thoại (đã có trong PDF). */
export function familyMessage(p: Procedure, s: Session): string {
  return copy.share.message({
    procedure: p.name,
    docs: documentsFor(p, s),
    office: p.office.name,
    address: p.office.address,
    fee: p.office.fee,
    exempt: feeExemptText(p, s),
  });
}

/**
 * Tạo PDF, chép tin nhắn, mở bảng chia sẻ.
 * Trả về `false` nếu máy không chia sẻ được tệp (màn hình nên báo `copy.share.unavailable`).
 * Màn hình nên báo `copy.share.copied` TRƯỚC khi gọi, để bác biết cần dán tin nhắn.
 */
export async function shareWithFamily(p: Procedure, s: Session): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  const uri = await makeFormPdf(p, s);
  await Clipboard.setStringAsync(familyMessage(p, s));
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: '.pdf', dialogTitle: copy.share.dialogTitle });
  return true;
}
