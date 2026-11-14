// Toàn bộ câu chữ cố định của app. Xưng "con", gọi "bác".
// 👤 C sở hữu file này — sửa lời thoại ở đây, không cần đụng code.

export const copy = {
  appName: 'Trợ lý thủ tục',

  home: {
    title: 'Bấm và nói điều bác cần',
    subtitle: 'Ví dụ: "Tôi mới chuyển đến, muốn đăng ký tạm trú"',
    greeting: 'Chào bác. Bác bấm nút đỏ rồi nói điều bác cần làm nhé.',
    resume: 'Tiếp tục hồ sơ đang làm',
    typeInstead: 'Hoặc gõ chữ',
    check: 'Kiểm tra hệ thống',
  },

  mic: {
    idle: 'Bấm để nói',
    recording: 'Đang nghe… bấm để dừng',
    transcribing: 'Con đang nghe lại…',
    thinking: 'Con đang xử lý…',
    tooShort: 'Con chưa nghe thấy gì, bác bấm và nói lại nhé.',
    slow: 'Mạng hơi chậm, con vẫn đang nghe bác nói…',
    retry: 'Gửi lại câu vừa nói',
    permissionDenied:
      'App chưa được dùng micro. Bác vào Cài đặt → Ứng dụng → Trợ lý thủ tục → Quyền → Micro để cho phép, hoặc gõ chữ ở dưới.',
  },

  confirm: {
    ask: 'Đúng không ạ?',
    yes: 'Đúng',
    no: 'Không phải',
    retry: 'Bác nói lại giúp con điều bác cần nhé.',
    notFound: 'Con chưa rõ bác cần làm thủ tục gì, bác nói lại giúp con nhé.',
  },

  ask: {
    step: (i: number, n: number) => `Bước ${i}/${n}`,
    repeatQuestion: 'Nghe lại câu hỏi',
    skip: 'Bỏ qua câu này',
    youSaid: 'Bác vừa nói:',
    filledTitle: 'Đã ghi (bấm để sửa):',
    invalidPrefix: 'Con nghe chưa rõ ạ.',
    confirmNumber: (label: string, spoken: string) => `Dạ, con ghi ${label.toLowerCase()} là: ${spoken}.`,
    confirmValue: (label: string, spoken: string) => `Dạ, con ghi ${label.toLowerCase()} là ${spoken}.`,
    skippedValue: '(để trống — bổ sung sau)',
  },

  result: {
    title: 'Xong rồi bác ạ!',
    intro: (name: string) => `Con đã điền xong tờ khai ${name}. Con đọc lại để bác kiểm tra nhé.`,
    replay: 'Nghe lại',
    pdf: 'Xem / gửi tờ khai PDF',
    docsTitle: 'Giấy tờ cần mang',
    officeTitle: 'Nơi nộp',
    newCase: 'Làm hồ sơ mới',
    outro: 'Bác mang theo các giấy tờ trên đến công an phường nhé.',
  },

  share: {
    button: 'Gửi cho con cháu nộp giúp',
    making: 'Đang chuẩn bị…',
    copied: 'Con đã chép sẵn tin nhắn. Bác chọn Zalo, gửi tờ khai, rồi giữ tay vào ô chat và bấm "Dán" để gửi kèm lời nhắn nhé.',
    unavailable: 'Điện thoại này chưa gửi được tệp, bác nhờ con cháu xem giúp nhé.',
    dialogTitle: 'Gửi tờ khai cho con cháu',
    // Tin nhắn soạn sẵn. KHÔNG đưa số căn cước / số điện thoại vào đây — các số đó đã nằm trong PDF.
    message: (o: { procedure: string; docs: string[]; office: string; address: string; fee?: string; exempt?: string | null }) =>
      [
        `Con ơi, bố/mẹ cần làm thủ tục: ${o.procedure}.`,
        `Tờ khai bố/mẹ đã điền sẵn ở tệp PDF gửi kèm. Con dựa vào đó nộp giúp bố/mẹ trên VNeID hoặc Cổng Dịch vụ công nhé.`,
        o.docs.length ? `Giấy tờ cần có:\n${o.docs.map((d) => `- ${d}`).join('\n')}` : '',
        `Nơi nộp: ${o.office}. ${o.address}`,
        o.exempt ? `Lệ phí: ${o.exempt}` : o.fee ? `Lệ phí: ${o.fee}` : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
  },

  counter: {
    handOver: 'Đưa máy cho cán bộ',
    done: 'Xong',
  },

  prepare: {
    openMap: '📍 Mở bản đồ',
    feeExempt: 'Bác được miễn lệ phí',
  },

  errors: {
    network: 'Mạng đang chập chờn, bác thử lại giúp con nhé.',
    generic: 'Có lỗi xảy ra, bác thử lại giúp con nhé.',
  },
};
