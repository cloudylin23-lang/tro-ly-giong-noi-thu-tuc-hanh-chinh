# Trợ lý thủ tục 🎤

> Nói điều mình cần, AI lo phần điền tờ khai và giấy tờ.

Người lớn tuổi chỉ cần nói tự nhiên, ví dụ *"Bác mới lên ở với con, muốn đăng ký tạm trú"*. App nhận ra đúng thủ tục, hỏi lại **từng thông tin một bằng giọng nói**, kiểm tra lại, rồi đọc to bản tóm tắt. Cuối cùng app xuất **tờ khai PDF điền sẵn**, kèm checklist giấy tờ và nơi nộp.

Dự án cho Codex Community Hackathon Hà Nội, 14/11/2026. Chủ đề: dịch vụ công.

---

## Kiến trúc

```
Điện thoại Android (APK, Expo / React Native)
  ├─ expo-audio  ghi âm m4a
  ├─ state machine (src/lib/flow.ts)  ← CODE nắm luồng hỏi đáp
  ├─ expo-speech  đọc to bằng giọng vi-VN của máy
  ├─ expo-print   tờ khai HTML → PDF
  └─ AsyncStorage lưu phiên (đóng app mở lại vẫn còn)
          │ HTTPS
Vercel (server/, region sin1)
  ├─ POST /api/stt   audio → chữ        (OpenAI gpt-4o-transcribe)
  ├─ POST /api/turn  classify | extract (OpenAI, Structured Outputs)
  └─ GET  /api/health
```

**Nguyên tắc:** AI không tự dẫn hội thoại. AI chỉ làm 2 việc nhỏ: (1) phân loại thủ tục, (2) trích giá trị từ câu trả lời (kể cả khi người dùng nói nhiều thông tin trong một câu). Code quyết định hỏi gì tiếp theo và **kiểm tra dữ liệu** (CCCD đủ 12 số, ngày sinh hợp lệ, SĐT 10 số). Nhờ vậy demo ổn định.

## Cấu trúc thư mục

```
mobile/                 App Expo (SDK 58)
  src/app/              Màn hình (expo-router)
    index.tsx           1. Chào: nút mic, nói nhu cầu
    confirm.tsx         2. "Con hiểu bác muốn… Đúng không ạ?"
    ask.tsx             3. Hỏi đáp từng bước, Bước x/N, sửa/bỏ qua
    result.tsx          4. Tóm tắt, đọc to, PDF, giấy tờ, nơi nộp
    check.tsx           Kiểm tra hệ thống trước demo
  src/components/       MicButton, BigButton, Bubble, ProgressBar, TextFallback…
  src/hooks/useVoiceInput.ts   ghi âm → STT
  src/lib/              api, flow (state machine), validate, speech, pdf, storage
  src/data/procedures/  Cấu hình thủ tục (JSON) — thêm thủ tục không cần code
  src/copy.ts           Toàn bộ lời thoại
  src/theme.ts          Chữ to, tương phản cao, vùng bấm ≥ 72px
server/                 Vercel functions
  api/                  health, stt, turn
  lib/                  openai, turn (schema động), stt, http
  prompts/              classify.ts, extract.ts
  scripts/dev.ts        Chạy server local (không cần Vercel)
  scripts/run-samples.ts  Test prompt hàng loạt + đo độ trễ
docs/                   Research người dùng, số liệu, kịch bản demo
```

---

## Cài đặt

### 0. Cần có
- Node.js 20 trở lên, Git
- Android Studio (SDK + emulator; JDK có sẵn). Đặt `ANDROID_HOME` và `JAVA_HOME`
- Tài khoản: OpenAI API (nạp khoảng 5 USD, đặt giới hạn chi tiêu), Vercel, Expo

### 1. Server: chạy local
```bash
cd server
npm install
cp .env.example .env.local      # điền OPENAI_API_KEY
npm run samples                 # test prompt: phải ra ✅ và độ trễ p50 < ~2s
npm run dev                     # http://localhost:3000/api/health
```

### 2. Server: deploy lên Vercel (bắt buộc cho bản APK)
```bash
cd server
npx vercel login
npx vercel                      # lần đầu: link project, Root Directory = server
npx vercel env add OPENAI_API_KEY
npx vercel env add APP_TOKEN    # chuỗi ngẫu nhiên, vd: openssl rand -hex 16
npx vercel --prod
curl https://<project>.vercel.app/api/health   # phải thấy "hasKey": true
```

### 3. App: chạy trên emulator hoặc máy thật (bản debug)
```bash
cd mobile
npm install
cp .env.example .env            # emulator + server local: http://10.0.2.2:3000
npx expo run:android            # build + cài lên thiết bị đang cắm/emulator
```
Emulator: vào **⋯ → Microphone**, bật *"Virtual microphone uses host audio input"*.

### 4. Build APK để demo (bản release)
Trong `mobile/eas.json`, sửa `EXPO_PUBLIC_API_URL` thành URL Vercel và `EXPO_PUBLIC_APP_TOKEN` bằng đúng giá trị `APP_TOKEN`. Sau đó:
```bash
cd mobile
npx eas-cli@latest login
npm run build:apk               # build cloud, quét QR / tải APK về máy
# Dự phòng khi hàng chờ EAS lâu (cần .env trỏ tới URL Vercel):
npm run android:release
```

> ⚠️ Bản **debug** lấy JS từ laptop: rút cáp là app trắng màn hình. Demo phải dùng **bản release / APK**.
> ⚠️ Bản release **chặn HTTP**, nên chỉ dùng được URL `https://` (Vercel).

---

## Checklist trước demo
- [ ] Mở **Kiểm tra hệ thống** trong app: cả 3 mục đều ✅ (máy chủ, giọng tiếng Việt, micro + STT)
- [ ] Android: Cài đặt → Chuyển văn bản thành giọng nói → Google → **tải Tiếng Việt**
- [ ] Đã cho phép quyền micro
- [ ] Chạy trên **4G / hotspot riêng**, không dùng wifi sự kiện
- [ ] Vuốt tắt hẳn app → mở lại → chạy hết luồng: **3 lần liên tiếp không lỗi**
- [ ] Bật Không làm phiền, sạc đầy pin

## Đổi model
Sửa biến môi trường của server (`.env.local` / Vercel):
- `OPENAI_MODEL`: mặc định `gpt-4.1-mini`. Có thể thử model mini mới hơn, ví dụ `gpt-5.4-mini` với `OPENAI_REASONING_EFFORT=none`.
- `OPENAI_STT_MODEL`: mặc định `gpt-4o-transcribe`. Có thể thử `gpt-4o-mini-transcribe` (rẻ và nhanh hơn).

Chạy `npm run samples` để so độ chính xác và độ trễ trước khi đổi.

## Thêm thủ tục mới
1. Tạo `mobile/src/data/procedures/<ten>.json` theo cấu trúc của `tam-tru.json`.
2. Thêm vào mảng trong `mobile/src/data/procedures/index.ts`.
3. Thêm câu mẫu vào `server/scripts/samples.json`, rồi chạy `npm run samples`.

---

## Làm trước sự kiện / Làm trong ngày hackathon
*(Thể lệ yêu cầu công khai phần này)*

| Làm trước 14/11 | Làm trong ngày 14/11 |
|---|---|
| Bộ khung Expo + cấu hình build APK | *(điền vào trong ngày)* |
| Backend STT / LLM trên Vercel, prompt nháp, script test | |
| State machine hỏi đáp, kiểm tra dữ liệu, lưu phiên | |
| 4 màn hình ở mức khung, template PDF | |
| Dữ liệu nháp 2 thủ tục | |
| Phỏng vấn người dùng (docs/research) | |

## Lưu ý dữ liệu
- Dữ liệu thủ tục trong `src/data/procedures/` là **bản nháp**, phải đối chiếu với Cổng Dịch vụ công / VNeID hiện hành.
- PDF là **bản mô phỏng nội dung** tờ khai, không phải biểu mẫu chính thức.
- Demo chỉ dùng **thông tin giả**, không dùng số CCCD thật.
- Server không lưu audio hay dữ liệu cá nhân (`store: false`). Phiên làm việc chỉ lưu trên máy người dùng.
