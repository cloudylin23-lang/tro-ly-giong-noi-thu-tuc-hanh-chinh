# Hướng dẫn cho AI agent (Codex / Claude)

Monorepo gồm 2 phần độc lập:
- `mobile/`: app Expo SDK 58 (React Native + TypeScript + expo-router, routes trong `mobile/src/app/`). Đọc thêm `mobile/AGENTS.md`.
- `server/`: Vercel functions (Node, ESM, web-standard `export default { fetch }`), OpenAI SDK v7.

## Quy tắc kiến trúc (đừng phá)
- **Code nắm luồng, AI chỉ trích dữ liệu.** Thứ tự câu hỏi và điều kiện hoàn tất nằm ở `mobile/src/lib/flow.ts`, đọc từ JSON trong `mobile/src/data/procedures/`. Không chuyển việc dẫn hội thoại sang LLM.
- Mọi giá trị AI trả về phải qua `mobile/src/lib/validate.ts` trước khi lưu.
- LLM luôn dùng Structured Outputs (`strict: true`). Schema dựng động trong `server/lib/turn.ts`.
- Kiểu request/response ở `server/lib/types.ts` và `mobile/src/types.ts` phải khớp nhau.
- Lời thoại cố định nằm ở `mobile/src/copy.ts`. Token giao diện ở `mobile/src/theme.ts` (chữ ≥ 20px, nút ≥ 72px).
- API key chỉ nằm ở server. Không bao giờ đưa key vào `mobile/`.
- Không lưu dữ liệu người dùng ở server (không thêm cơ sở dữ liệu, gọi OpenAI với `store: false`). Phiên chỉ nằm trên điện thoại.
- Log chỉ ghi độ dài và metadata, không ghi nội dung câu nói, số căn cước, số điện thoại (xem `server/lib/log.ts`).
- `APP_TOKEN` không phải bí mật (nằm trong APK). Không dựa vào nó cho quyền gì ngoài chặn gọi API bừa bãi.

## Lệnh kiểm tra trước khi xong việc
```bash
cd mobile && npm run check:data && npx tsc --noEmit && npx expo-doctor
cd server && npx tsc --noEmit && npm run samples   # cần OPENAI_API_KEY trong .env.local
```
Dùng `npx expo install <pkg>` để thêm thư viện cho mobile (không dùng `npm install`).
Số căn cước / số điện thoại do code tự đổi từ câu nói (`digitsFromSpeech` trong `validate.ts`), không tin giá trị AI.

## CI/CD (`.github/workflows/`)
- `ci.yml`: mọi PR và push lên main → kiểm tra dữ liệu thủ tục, typecheck, expo-doctor, đóng gói thử bundle Android, typecheck server. PR chỉ gộp khi xanh.
- `deploy-server.yml`: push lên main có sửa `server/` → deploy Vercel production rồi kiểm tra `/api/health` có key. Cần secret `VERCEL_TOKEN`.
- `build-apk.yml`: bấm tay ở tab Actions → gửi lệnh build APK lên EAS. Cần secret `EXPO_TOKEN` và `extra.eas.projectId` trong `app.json`.
- Commit/PR không thêm dòng `Co-Authored-By: Claude`.
