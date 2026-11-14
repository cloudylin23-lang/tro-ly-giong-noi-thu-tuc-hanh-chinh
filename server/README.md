# Server — Vercel functions

Stateless có chủ đích: server **không lưu gì** (không DB, gọi OpenAI với `store: false`). Phiên làm việc chỉ nằm trên điện thoại.

| Endpoint | Việc |
|---|---|
| `GET /api/health` | `ok`, `hasKey`, model đang dùng; `ok:false` + `problems` nếu thiếu/sai biến môi trường |
| `POST /api/stt` | multipart, field `audio` → `{ text }` |
| `POST /api/turn` | `{ mode: "classify" \| "extract", … }` → JSON theo schema |

## Lệnh

```bash
npm run dev        # server local http://localhost:3000 (cần .env.local, thiếu biến → dừng ngay)
npm test           # test tự động, mock OpenAI — KHÔNG gọi API thật, không tốn tiền
npm run samples    # gọi OpenAI THẬT với câu mẫu (scripts/samples.json), in ✅/❌, độ trễ, log chi phí
npx tsc --noEmit   # typecheck
```

> Windows: nếu `npm test` báo *"Vitest failed to find the current suite"*, terminal đang ở đường dẫn `c:\…` (chữ thường). Mở terminal mới ở `C:\…` (chữ hoa) hoặc chạy từ PowerShell. CI (Linux) không bị.

## Cấu hình — `lib/config.ts`
Mọi biến môi trường đọc ở **một chỗ**, kiểm tra một lần lúc khởi động. Danh sách + ý nghĩa: [`.env.example`](.env.example). Bắt buộc duy nhất: `OPENAI_API_KEY`.

## Khi OpenAI lỗi — `withFallback` trong `lib/openai.ts`
| Loại lỗi | Ví dụ | Xử lý |
|---|---|---|
| tạm thời | 429 rate limit, timeout, mất kết nối, 5xx | thử 1 lần với model dự phòng |
| model hỏng | 404 model không tồn tại, AI trả sai định dạng | thử 1 lần với model dự phòng |
| input sai | 400/422 (vd file ghi âm hỏng) | trả 400 ngay, **không** thử lại |
| sai key | 401/403 | trả 500 ngay (lỗi cấu hình server) |
| hết quota | 429 `insufficient_quota` | trả 503 ngay (model khác cùng tài khoản cũng hết) |

Model dự phòng mặc định: `gpt-4o-mini` (LLM), `gpt-4o-mini-transcribe` (STT). Timeout từng lần gọi cấu hình được; tổng chính + dự phòng phải nhỏ hơn `maxDuration` trong `vercel.json`.

## Log — `lib/log.ts`
Mỗi dòng log là 1 JSON có `reqId`. Request id lấy từ header `x-request-id` của app (nếu hợp lệ) hoặc tự sinh, trả lại trong header `x-request-id` và trong body lỗi `{ error, requestId }`.

Truy một phiên lỗi: Vercel → project → **Logs** → tìm theo `reqId`.

| `msg` | Khi nào | Trường chính |
|---|---|---|
| `request` | kết thúc mỗi request | `status`, `ms`, `openaiCalls`, `openaiCostUsd` |
| `openai.call` | mỗi lần gọi OpenAI thành công | `model`, `attempt`, `inputTokens`, `outputTokens`, `costUsd` |
| `openai.failed` / `openai.fallback` | model lỗi / chuyển sang dự phòng | `kind`, `errorStatus`, `errorCode` |
| `turn.*`, `stt.*` | đầu vào/kết quả | chỉ độ dài, act, các key đã trích |
| `config.invalid` | cold start thiếu/sai biến | `problems` |

**Không log nội dung câu nói, số căn cước, số điện thoại** — chỉ độ dài và metadata.

Chi phí (`lib/pricing.ts`) là **ước tính** theo bảng đơn giá tham khảo — kiểm tra lại giá trên trang OpenAI khi cần số chính xác. Đo thực tế với `gpt-4.1-mini`: khoảng $0.0006 mỗi lượt hỏi đáp.
