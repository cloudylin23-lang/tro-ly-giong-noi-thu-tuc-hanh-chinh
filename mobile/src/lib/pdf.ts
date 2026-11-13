// Tạo tờ khai PDF từ HTML rồi mở hộp thoại chia sẻ (Zalo, Gmail, in…).
// 👤 B sở hữu template này. Đây là bản MÔ PHỎNG nội dung mẫu, không phải biểu mẫu chính thức.
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Procedure, Session } from '@/types';
import { displayable } from './validate';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function formHtml(p: Procedure, s: Session): string {
  const today = new Date();
  const rows = p.fields
    .map((f) => {
      const v = s.filled[f.key];
      return `<tr><td class="label">${esc(f.label)}</td><td class="value">${
        v ? esc(displayable(f.kind, v)) : '<span class="empty">…………………………</span>'
      }</td></tr>`;
    })
    .join('');
  const docs = p.documents.map((d) => `<li>☐ ${esc(d)}</li>`).join('');

  return `<!doctype html><html lang="vi"><head><meta charset="utf-8" />
<style>
  @page { margin: 28px; }
  body { font-family: "Times New Roman", serif; color: #000; font-size: 15px; line-height: 1.45; }
  .center { text-align: center; }
  .nation { font-weight: bold; text-transform: uppercase; }
  .motto { font-weight: bold; text-decoration: underline; }
  h1 { font-size: 18px; margin: 18px 0 4px; text-align: center; }
  .sub { text-align: center; font-style: italic; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  td { border: 1px solid #444; padding: 8px 10px; vertical-align: top; }
  .label { width: 42%; background: #f3f3f3; }
  .value { font-weight: bold; }
  .empty { color: #999; font-weight: normal; }
  .sign { display: flex; justify-content: space-between; margin-top: 28px; text-align: center; }
  .sign div { width: 45%; }
  .note { margin-top: 22px; padding: 10px; border: 1px dashed #888; font-size: 13px; }
  h2 { font-size: 16px; margin-top: 22px; }
  ul { list-style: none; padding-left: 4px; }
</style></head><body>
  <div class="center nation">Cộng hoà xã hội chủ nghĩa Việt Nam</div>
  <div class="center motto">Độc lập – Tự do – Hạnh phúc</div>
  <h1>${esc(p.formTitle)}</h1>
  <div class="sub">Kính gửi: ${esc(p.office.name)}</div>
  <table>${rows}</table>
  <div class="sign">
    <div>Ý KIẾN CỦA CHỦ HỘ / CHỦ NHÀ<br/><i>(ký, ghi rõ họ tên)</i></div>
    <div>Ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}<br/>NGƯỜI KÊ KHAI<br/><i>(ký, ghi rõ họ tên)</i></div>
  </div>
  <h2>Giấy tờ cần mang theo</h2>
  <ul>${docs}</ul>
  <h2>Nơi nộp</h2>
  <div>${esc(p.office.name)}<br/>${esc(p.office.address)}<br/>${esc(p.office.hours)}</div>
  <div class="note">Bản điền sẵn do Trợ lý thủ tục tạo từ lời kể của người dân. Vui lòng kiểm tra lại thông tin
  và đối chiếu với biểu mẫu chính thức trước khi nộp.</div>
</body></html>`;
}

export async function shareFormPdf(p: Procedure, s: Session): Promise<string> {
  const { uri } = await Print.printToFileAsync({ html: formHtml(p, s), width: 595, height: 842 }); // A4
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: '.pdf', dialogTitle: p.formTitle });
  }
  return uri;
}
