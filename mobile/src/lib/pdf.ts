// Tạo tờ khai PDF từ HTML rồi mở hộp thoại chia sẻ (Zalo, Gmail, in…).
// Thủ tục có `form: "CT01"` → dựng theo bố cục Mẫu CT01 (Thông tư 116/2026/TT-BCA),
// `form: "DC02"` → Mẫu DC02 (Thông tư 118/2026/TT-BCA). `extraForms` (Mẫu 02) in thêm trang khi cần.
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
function xaPhuong(address: string | undefined): string | undefined {
  const part = address
    ?.split(/[,;]/)
    .map((s) => s.trim())
    .find((s) => /^(phường|xã|đặc khu)\s+\S/i.test(s));
  return part?.replace(/^\S+/, (w) => w.toLowerCase());
}

function residenceOffice(address: string | undefined, fallback: string): string {
  const part = xaPhuong(address);
  return part ? `Công an ${part}` : fallback;
}

/** Giá trị đã điền của một field, in đậm; chưa có thì in dấu chấm */
const fieldVal = (p: Procedure, s: Session) => (key: string) => {
  const field = p.fields.find((x) => x.key === key);
  const v = s.filled[key];
  return field && v ? `<span class="v">${esc(displayable(field, v))}</span>` : DOTS;
};

function idBoxes(digits: string | undefined): string {
  const d = (digits ?? '').padEnd(12, ' ').slice(0, 12).split('');
  return `<span class="boxes">${d.map((c) => `<span>${c.trim() ? esc(c) : '&nbsp;'}</span>`).join('')}</span>`;
}

function ct01Html(p: Procedure, s: Session): string {
  const f = s.filled;
  const val = fieldVal(p, s);
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
    <div>${dateLine}<b>Ý KIẾN CỦA CHA HOẶC MẸ<br/>HOẶC NGƯỜI GIÁM HỘ</b>Họ và tên: ……………<br/>Số định danh cá nhân: ……………</div>
    <div>${dateLine}<b>NGƯỜI KÊ KHAI</b>${f.ho_ten ? esc(f.ho_ten) : ''}</div>
  </div>

  ${extraPages(p, s)}
  <div class="page"></div>
  ${guide(p, s)}`,
  );
}

// ---------- Mẫu số 02 (Nghị định 58/2026/NĐ-CP) ----------

/** Trang tờ khai phụ (vd Mẫu 02) cho những trường hợp cần — điều kiện nằm ở `extraForms` trong JSON */
function extraPages(p: Procedure, s: Session): string {
  return (p.extraForms ?? [])
    .filter((x) => x.when.in.includes(s.filled[x.when.field] ?? ''))
    .map((x) => `<div class="page"></div>${mau02Body(p, s, x.title)}`)
    .join('');
}

function mau02Body(p: Procedure, s: Session, title: string): string {
  const f = s.filled;
  const val = fieldVal(p, s);
  const address = f.dia_chi_tam_tru ?? f.dia_chi_thuong_tru;
  const area = xaPhuong(address);
  const purpose = p.id === 'tam_tru' ? 'đăng ký tạm trú' : 'đăng ký thường trú';
  return `
  <div class="right">Mẫu số 02, Phụ lục IV, Nghị định số 58/2026/NĐ-CP</div>
  <div class="center nation">Cộng hòa xã hội chủ nghĩa Việt Nam</div>
  <div class="center motto">Độc lập – Tự do – Hạnh phúc</div>
  <h1>${esc(title)}</h1>
  <div class="sub">Kính gửi: <span class="v">${area ? `Ủy ban nhân dân ${esc(area)}` : '……………………………'}</span></div>
  <h2>I. THÔNG TIN NGƯỜI ĐỀ NGHỊ</h2>
  <div class="item">1. Họ, chữ đệm và tên: ${val('ho_ten')}</div>
  <div class="item">2. Ngày, tháng, năm sinh: ${val('ngay_sinh')}</div>
  <div class="item">3. Số định danh cá nhân: ${val('so_dinh_danh')}</div>
  <div class="item">4. Nơi cư trú: ${val('noi_cu_tru_hien_nay')}</div>
  <h2>II. THÔNG TIN VỀ CHỖ Ở HỢP PHÁP</h2>
  <div class="item">1. Địa chỉ chỗ ở hợp pháp: ${address ? `<span class="v">${esc(address)}</span>` : DOTS}</div>
  <div class="item">2. Thông tin về nhà ở:</div>
  <div class="item">- Diện tích thửa đất: ${DOTS} Diện tích xây dựng: ${DOTS} Diện tích sàn: ${val('dien_tich_san')}</div>
  <div class="item">- Tổng số người đang đăng ký thường trú: ${val('so_nguoi_thuong_tru')}</div>
  <div class="item">- Diện tích sàn còn lại được đăng ký thường trú khi cho thuê, mượn, ở nhờ: ${DOTS}</div>
  <h2>III. NỘI DUNG ĐỀ NGHỊ ỦY BAN NHÂN DÂN XÁC NHẬN:</h2>
  <div class="item">1. Tình trạng chỗ ở để đăng ký thường trú, tạm trú: <span class="v">Xác nhận chỗ ở tại ${
    address ? esc(address) : '…'
  } là chỗ ở hợp pháp để ${purpose}.</span></div>
  <div class="item">2. Diện tích nhà ở để đăng ký thường trú khi cho thuê, mượn, ở nhờ:</div>
  <div class="item">Tổng số người thuê, mượn, ở nhờ: ${DOTS}</div>
  <div class="item">Tổng số diện tích chỗ ở hợp pháp thuê, mượn, ở nhờ: ${DOTS}</div>
  <div class="sign">
    <div><b>XÁC NHẬN CỦA ỦY BAN NHÂN DÂN</b>(Ký tên, đóng dấu)</div>
    <div>……, ngày …… tháng …… năm ……<b>NGƯỜI ĐỀ NGHỊ</b>${f.ho_ten ? esc(f.ho_ten) : ''}</div>
  </div>`;
}

// ---------- Mẫu DC02 (Thông tư 118/2026/TT-BCA) ----------

const DC02_REASON: Record<string, string> = {
  mat: 'Cấp lại thẻ căn cước do bị mất thẻ.',
  hong: 'Cấp lại thẻ căn cước do thẻ bị hư hỏng không sử dụng được.',
  tro_lai_quoc_tich: 'Cấp lại thẻ căn cước do được trở lại quốc tịch Việt Nam.',
};

function dc02Html(p: Procedure, s: Session): string {
  const f = s.filled;
  const val = fieldVal(p, s);
  const box = (on: boolean, text: string) => `<div class="item">${on ? '☑' : '☐'} ${text}</div>`;
  const today = new Date();
  return page(
    p.formTitle,
    `
  <div class="right">Mẫu DC02 ban hành kèm theo Thông tư số 118/2026/TT-BCA<br/>ngày 29/6/2026 của Bộ trưởng Bộ Công an</div>
  <div class="center nation">Cộng hòa xã hội chủ nghĩa Việt Nam</div>
  <div class="center motto">Độc lập – Tự do – Hạnh phúc</div>
  <h1>PHIẾU ĐỀ NGHỊ<br/>Giải quyết thủ tục về căn cước</h1>
  <div class="sub">Kính gửi: ……………………………</div>
  <h2>I. THÔNG TIN NGƯỜI ĐỀ NGHỊ</h2>
  <div class="item">1. Họ, chữ đệm và tên khai sinh: ${val('ho_ten')}</div>
  <div class="item">2. Ngày, tháng, năm sinh: ${val('ngay_sinh')} &nbsp;&nbsp;&nbsp; 3. Giới tính: ${val('gioi_tinh')}</div>
  <div class="item">4. Số định danh cá nhân: ${idBoxes(f.so_dinh_danh)}</div>
  <div class="item">5. Nơi cư trú: ${val('noi_cu_tru')}</div>
  <h2>II. THÔNG TIN NGƯỜI ĐẠI DIỆN THỰC HIỆN THỦ TỤC (nếu có)</h2>
  <div class="item">1. Họ, chữ đệm và tên khai sinh: ${DOTS}</div>
  <div class="item">2. Ngày, tháng, năm sinh: ${DOTS} &nbsp;&nbsp;&nbsp; 3. Giới tính: ${DOTS}</div>
  <div class="item">4. Số định danh cá nhân: ${idBoxes(undefined)}</div>
  <div class="item">5. Số điện thoại liên hệ: ${DOTS} Email: ${DOTS}</div>
  <h2>III. NỘI DUNG ĐỀ NGHỊ</h2>
  ${box(true, '1. Cấp, cấp đổi, cấp lại thẻ căn cước')}
  ${box(false, '2. Khai thác thông tin trong Cơ sở dữ liệu quốc gia về dân cư')}
  ${box(false, '3. Khai thác thông tin trong Cơ sở dữ liệu căn cước')}
  ${box(false, '4. Điều chỉnh thông tin trong Cơ sở dữ liệu quốc gia về dân cư')}
  ${box(false, '5. Tích hợp thông tin vào thẻ căn cước')}
  ${box(false, '6. Thu thập, cập nhật thông tin vào Cơ sở dữ liệu căn cước')}
  <div class="item">7. Nội dung cụ thể: <span class="v">${esc(DC02_REASON[f.ly_do ?? ''] ?? 'Cấp lại thẻ căn cước.')}</span></div>
  <h2>IV. ĐỊA CHỈ NHẬN KẾT QUẢ: ${val('dia_chi_nhan_ket_qua')}</h2>
  <div class="sign">
    <div><b>Ý KIẾN CỦA CHỦ THỂ THÔNG TIN</b>(để trống nếu người đề nghị tự làm)</div>
    <div>……, ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}<b>NGƯỜI ĐỀ NGHỊ</b>${
      f.ho_ten ? esc(f.ho_ten) : ''
    }</div>
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
  if (p.form === 'CT01') return ct01Html(p, s);
  if (p.form === 'DC02') return dc02Html(p, s);
  return tableHtml(p, s);
}

export async function shareFormPdf(p: Procedure, s: Session): Promise<string> {
  const { uri } = await Print.printToFileAsync({ html: formHtml(p, s), width: 595, height: 842 }); // A4
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: '.pdf', dialogTitle: p.formTitle });
  }
  return uri;
}
