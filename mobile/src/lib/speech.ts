// Đọc to bằng TTS có sẵn trên máy (giọng vi-VN).
// Android: Cài đặt → Chuyển văn bản thành giọng nói → Google → tải gói Tiếng Việt.
import * as Speech from 'expo-speech';

let voiceId: string | undefined;
let voiceLoaded = false;

export async function findVietnameseVoice(): Promise<Speech.Voice | undefined> {
  const voices = await Speech.getAvailableVoicesAsync().catch(() => [] as Speech.Voice[]);
  const vi = voices.filter((v) => v.language?.toLowerCase().replace('_', '-').startsWith('vi'));
  // Ưu tiên giọng chất lượng cao, rồi giọng không cần mạng
  return (
    vi.find((v) => v.quality === Speech.VoiceQuality.Enhanced) ??
    vi.find((v) => !/network/i.test(v.identifier)) ??
    vi[0]
  );
}

async function ensureVoice() {
  if (voiceLoaded) return;
  voiceLoaded = true;
  voiceId = (await findVietnameseVoice())?.identifier;
}

/** Đọc một câu, resolve khi đọc xong hoặc bị dừng. */
export async function speak(text: string): Promise<void> {
  await ensureVoice();
  await Speech.stop();
  return new Promise((resolve) => {
    Speech.speak(text, {
      language: 'vi-VN',
      voice: voiceId,
      rate: 0.9, // chậm hơn một chút cho người lớn tuổi
      pitch: 1.0,
      onDone: resolve,
      onStopped: resolve,
      onError: () => resolve(),
    });
  });
}

export function stopSpeaking() {
  return Speech.stop();
}
