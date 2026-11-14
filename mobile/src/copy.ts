// Toàn bộ câu chữ cố định của app. Xưng "con", gọi "bác".
// 👤 C sở hữu file này — sửa lời thoại ở đây, không cần đụng code.

export const copy = {
  appName: 'Trợ lý thủ tục',

  header: {
    confirm: 'Xác nhận thủ tục bác muốn làm',
    result: 'Kiểm tra thông tin hồ sơ',
    check: 'Kiểm tra hệ thống',
  },

  cancel: {
    label: 'Hủy thủ tục',
    title: 'Bác muốn hủy thủ tục này ạ?',
    message: 'Thông tin bác đã điền cho hồ sơ này sẽ bị xóa. Bác sẽ quay về trang chủ.',
    beforeStart: 'Bác sẽ quay về trang chủ và không bắt đầu thủ tục này.',
    keep: 'Tiếp tục làm',
    confirm: 'Đồng ý hủy',
  },

  home: {
    title: 'Bấm và nói điều bác cần',
    subtitle: 'Ví dụ: "Tôi mới chuyển đến, muốn đăng ký tạm trú"',
    greeting: 'Chào bác. Bác bấm nút đỏ rồi nói điều bác cần làm nhé.',
    resume: 'Tiếp tục hồ sơ đang làm',
    typeInstead: 'Hoặc gõ chữ',
    check: 'Kiểm tra hệ thống',
    chooseProcedure: 'Hoặc chọn thủ tục bác cần làm',
  },

  mic: {
    idle: 'Bấm để nói',
    recording: 'Đang nghe… bấm để dừng',
    transcribing: 'Con đang nghe lại…',
    thinking: 'Con đang xử lý…',
    durationLabel: 'Thời gian ghi âm',
    tooShort: 'Con chưa nghe thấy gì, bác bấm và nói lại nhé.',
    permissionDenied:
      'App chưa được dùng micro. Bác vào Cài đặt → Ứng dụng → Trợ lý thủ tục → Quyền → Micro để cho phép, hoặc gõ chữ ở dưới.',
  },

  confirm: {
    replayHint: 'Bấm vào khung chữ để nghe lại',
    ask: 'Đúng không ạ?',
    yes: 'Đúng, bắt đầu',
    no: 'Không phải, chọn lại',
    retry: 'Bác nói lại giúp con điều bác cần nhé.',
    notFound: 'Con chưa rõ bác cần làm thủ tục gì, bác nói lại giúp con nhé.',
  },

  ask: {
    autoNextHint: 'Bác trả lời xong, con sẽ hỏi mục tiếp theo.',
    step: (i: number, n: number) => `Bước ${i}/${n}`,
    repeatQuestion: 'Nghe lại câu hỏi',
    skip: 'Bỏ qua câu này',
    youSaid: 'Bác vừa nói:',
    filledTitle: 'Đã ghi (bấm để sửa):',
    invalidPrefix: 'Con nghe chưa rõ ạ.',
    skippedValue: '(để trống — bổ sung sau)',
    optionalLabel: 'Không bắt buộc',
    optionalHint: 'Mục này không bắt buộc. Nếu không có, bác bấm nút Không có nhé.',
    none: 'Không có',
    optionalSkipped: 'Dạ không sao, con bỏ qua mục này cho bác nhé.',
    optionalEmpty: 'Không cung cấp (không bắt buộc)',
    chooseAnswer: 'Bác bấm một câu trả lời, hoặc nói bằng micro bên dưới.',
    choiceAccepted: (label: string) => `Con đã ghi: ${label}.`,
    genderOptions: [
      { value: 'Nam', label: 'Nam' },
      { value: 'Nữ', label: 'Nữ' },
    ],
    housingChoiceLabels: {
      nha_minh: 'Nhà của bác',
      nha_nguoi_than: 'Nhà người thân',
      thue_o_nho: 'Thuê, ở nhờ',
    } as Record<string, string>,
  },

  result: {
    title: 'Xong rồi bác ạ!',
    intro: (name: string) => `Con đọc lại thông tin tờ khai ${name} để bác kiểm tra nhé.`,
    reviewTitle: 'Bác bổ sung thông tin nhé',
    infoTitle: 'Thông tin bác đã điền',
    editHint: 'Bác bấm vào thông tin bên dưới để sửa hoặc bổ sung.',
    notSubmitted: 'Đây là bản khai để bác kiểm tra, hồ sơ chưa được nộp đến cơ quan tiếp nhận.',
    missingCount: (count: number) => `Còn ${count} mục cần bổ sung. Bác bấm vào mục chưa có thông tin để điền tiếp nhé.`,
    replay: 'Nghe lại',
    pdf: 'Xem / gửi tờ khai PDF',
    docsTitle: 'Giấy tờ cần mang',
    notesTitle: 'Lưu ý',
    officeTitle: 'Nơi nộp',
    newCase: 'Làm hồ sơ mới',
    outro: 'Bác mang theo các giấy tờ trên đến công an phường nhé.',
  },

  errors: {
    network: 'Mạng đang chập chờn, bác thử lại giúp con nhé.',
    generic: 'Có lỗi xảy ra, bác thử lại giúp con nhé.',
    retry: 'Thử lại',
  },
};
