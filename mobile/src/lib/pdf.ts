// Tạo tờ khai PDF từ HTML rồi mở hộp thoại chia sẻ (Zalo, Gmail, in…).
// Thủ tục có `form: "CT01"` → dựng theo bố cục Mẫu CT01 (Thông tư 116/2026/TT-BCA).
// Thủ tục khác → bảng chung. Đây là bản điền sẵn để chép / đối chiếu, không thay biểu mẫu chính thức.
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Procedure, Session } from '@/types';
import { activeFields, documentsFor } from './flow';
import { displayable } from './validate';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const DOTS = '<span class="empty">……………………………</span>';

const STYLE = `
  @page { margin: 28px; }
  body { font-family: "Times New Roman", serif; color: #000; font-size: 14.5px; line-height: 1.5; }
  .center { text-align: center; }
  .right { text-align: right; font-style: italic; font-size: 12px; }
  .nation { font-weight: bold; text-transform: uppercase; }
  .motto { font-weight: bold; text-decoration: underline; }
  h1 { font-size: 17px; margin: 16px 0 6px; text-align: center; }
  .sub { text-align: center; margin-bottom: 12px; }
  .item { margin: 5px 0; }
  .v { font-weight: bold; }
  .empty { color: #999; font-weight: normal; }
  .boxes { display: inline-flex; gap: 0; vertical-align: middle; margin-left: 6px; }
  .boxes span { display: inline-block; width: 20px; height: 22px; border: 1px solid #000; margin-left: -1px;
    text-align: center; font-weight: bold; line-height: 22px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  td, th { border: 1px solid #444; padding: 6px 8px; vertical-align: top; font-size: 13px; }
  th { background: #f3f3f3; font-weight: normal; }
  .label { width: 42%; background: #f3f3f3; }
  .value { font-weight: bold; }
  .sign { display: flex; justify-content: space-between; margin-top: 18px; text-align: center; font-size: 12.5px; gap: 6px; }
  .sign div { flex: 1; }
  .sign b { display: block; margin-bottom: 52px; }
  .note { margin-top: 18px; padding: 8px 10px; border: 1px dashed #888; font-size: 12px; }
  h2 { font-size: 15px; margin-top: 18px; }
  ul { list-style: none; padding-left: 4px; }
  .page { page-break-before: always; }
`;

function guide(p: Procedure, s: Session): string {
  const docs = documentsFor(p, s).map((d) => `<li>☐ ${esc(d)}</li>`).join('');
  const office = [p.office.name, p.office.address, p.office.hours, p.office.processing, p.office.fee]
    .filter((x): x is string => Boolean(x))
    .map(esc)
    .join('<br/>');
  return `
  <h2>Giấy tờ cần mang theo</h2>
  <ul>${docs}</ul>
  <h2>Nơi nộp</h2>
  <div>${office}</div>
  <div class="note">Bản điền sẵn do Trợ lý thủ tục tạo từ lời kể của người dân. Vui lòng kiểm tra lại thông tin
  và chép sang (hoặc đối chiếu với) biểu mẫu chính thức trước khi nộp.<br/>Căn cứ: ${esc(p.source)}</div>`;
}

const page = (title: string, body: string) =>
  `<!doctype html><html lang="vi"><head><meta charset="utf-8" /><title>${esc(title)}</title><style>${STYLE}</style></head><body>${body}</body></html>`;

// ---------- Mẫu CT01 ----------

/**
 * "…, phường Khương Đình, Hà Nội" → "Công an phường Khương Đình".
 * Chỉ xét từng cụm ngăn bởi dấu phẩy và cụm phải BẮT ĐẦU bằng phường/xã/đặc khu,
 * để tên đường như "5 Xã Đàn, phường Kim Liên" không bị nhận nhầm.
 */
function residenceOffice(address: string | undefined, fallback: string): string {
  const part = address
    ?.split(/[,;]/)
    .map((s) => s.trim())
    .find((s) => /^(phường|xã|đặc khu)\s+\S/i.test(s));
  return part ? `Công an ${part.replace(/^\S+/, (w) => w.toLowerCase())}` : fallback;
}

function idBoxes(digits: string | undefined): string {
  const d = (digits ?? '').padEnd(12, ' ').slice(0, 12).split('');
  return `<span class="boxes">${d.map((c) => `<span>${c.trim() ? esc(c) : '&nbsp;'}</span>`).join('')}</span>`;
}

function ct01Html(p: Procedure, s: Session): string {
  const f = s.filled;
  const val = (key: string) => {
    const field = p.fields.find((x) => x.key === key);
    const v = f[key];
    return field && v ? `<span class="v">${esc(displayable(field, v))}</span>` : DOTS;
  };
  const address = f.dia_chi_tam_tru ?? f.dia_chi_thuong_tru;
  const ownHome = f.loai_cho_o === 'nha_minh';

  // Chú thích (2): đăng ký thường trú/tạm trú ghi thông tin chủ hộ của hộ mới. Ở nhà mình → bác là chủ hộ.
  const chuHoTen = ownHome ? val('ho_ten') : val('ho_ten_chu_ho');
  const quanHe = ownHome ? '<span class="v">Chủ hộ</span>' : val('quan_he_chu_ho');
  const chuHoId = ownHome ? f.so_dinh_danh : f.so_dinh_danh_chu_ho;

  // Mục 10 — nội dung đề nghị (code tự ghép, không để AI viết)
  const noiDung =
    p.id === 'tam_tru'
      ? `Đăng ký tạm trú tại: ${address ? esc(address) : '…'}. Thời hạn tạm trú: ${f.thoi_han ? esc(f.thoi_han) : '…'}.`
      : p.id === 'thuong_tru'
        ? `Đăng ký thường trú tại: ${address ? esc(address) : '…'}.`
        : esc(p.name);

  const today = new Date();
  const dateLine = `……, ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`;
  const memberRows = Array.from({ length: 3 }, (_, i) => `<tr><td>${i + 1}</td><td></td><td></td><td></td><td></td><td></td></tr>`).join('');

  return page(
    p.formTitle,
    `
  <div class="right">Mẫu CT01 ban hành kèm theo Thông tư số 116/2026/TT-BCA<br/>ngày 29/6/2026 của Bộ trưởng Bộ Công an</div>
  <div class="center nation">Cộng hòa xã hội chủ nghĩa Việt Nam</div>
  <div class="center motto">Độc lập – Tự do – Hạnh phúc</div>
  <h1>TỜ KHAI THAY ĐỔI THÔNG TIN CƯ TRÚ</h1>
  <div class="sub">Kính gửi: <span class="v">${esc(residenceOffice(address, p.office.name))}</span></div>

  <div class="item">1. Họ, chữ đệm và tên khai sinh: ${val('ho_ten')}</div>
  <div class="item">2. Ngày, tháng, năm sinh: ${val('ngay_sinh')} &nbsp;&nbsp;&nbsp; 3. Giới tính: ${val('gioi_tinh')}</div>
  <div class="item">4. Số định danh cá nhân: ${idBoxes(f.so_dinh_danh)}</div>
  <div class="item">5. Số điện thoại liên hệ: ${val('so_dien_thoai')} &nbsp;&nbsp;&nbsp; 6. Email: ${val('email')}</div>
  <div class="item">7. Họ, chữ đệm và tên chủ hộ: ${chuHoTen} &nbsp;&nbsp;&nbsp; 8. Mối quan hệ với chủ hộ: ${quanHe}</div>
  <div class="item">9. Số định danh cá nhân của chủ hộ: ${idBoxes(chuHoId)}</div>
  <div class="item">10. Nội dung đề nghị: <span class="v">${noiDung}</span></div>
  <div class="item">11. Những thành viên trong hộ gia đình cùng thay đổi:</div>
  <table>
    <tr><th>TT</th><th>Họ, chữ đệm và tên</th><th>Ngày, tháng, năm sinh</th><th>Giới tính</th><th>Số định danh cá nhân</th><th>Mối quan hệ với chủ hộ</th></tr>
    ${memberRows}
  </table>

  <div class="sign">
    <div>${dateLine}<b>Ý KIẾN CỦA CHỦ HỘ</b></div>
    <div>${dateLine}<b>Ý KIẾN CỦA CHỦ SỞ HỮU<br/>CHỖ Ở HỢP PHÁP</b>Họ và tên: ……………<br/>Số định danh cá nhân: ……………</div>
    <div>${dateLine}<b>Ý KIẾN CỦA CHA, MẸ<br/>HOẶC NGƯỜI GIÁM HỘ</b></div>
    <div>${dateLine}<b>NGƯỜI KÊ KHAI</b>${f.ho_ten ? esc(f.ho_ten) : ''}</div>
  </div>

  <div class="page"></div>
  ${guide(p, s)}`,
  );
}

// ---------- Bảng chung cho thủ tục chưa có mẫu riêng ----------

function tableHtml(p: Procedure, s: Session): string {
  const today = new Date();
  const rows = activeFields(p, s)
    .map((f) => {
      const v = s.filled[f.key];
      return `<tr><td class="label">${esc(f.label)}</td><td class="value">${v ? esc(displayable(f, v)) : DOTS}</td></tr>`;
    })
    .join('');
  return page(
    p.formTitle,
    `
  <div class="center nation">Cộng hòa xã hội chủ nghĩa Việt Nam</div>
  <div class="center motto">Độc lập – Tự do – Hạnh phúc</div>
  <h1>${esc(p.formTitle)}</h1>
  <div class="sub"><i>Kính gửi: ${esc(p.office.name)}</i></div>
  <table>${rows}</table>
  <div class="sign">
    <div></div>
    <div>Ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}<b>NGƯỜI KÊ KHAI</b>${
      s.filled.ho_ten ? esc(s.filled.ho_ten) : ''
    }</div>
  </div>
  ${guide(p, s)}`,
  );
}

export function formHtml(p: Procedure, s: Session): string {
  return p.form === 'CT01' ? ct01Html(p, s) : tableHtml(p, s);
}

export async function shareFormPdf(p: Procedure, s: Session): Promise<string> {
  const { uri } = await Print.printToFileAsync({ html: formHtml(p, s), width: 595, height: 842 }); // A4
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: '.pdf', dialogTitle: p.formTitle });
  }
  return uri;
}
