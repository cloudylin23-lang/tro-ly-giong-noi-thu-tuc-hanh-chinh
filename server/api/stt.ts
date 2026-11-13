import { handler, json } from '../lib/http.js';
import { HttpError } from '../lib/openai.js';
import { transcribe } from '../lib/stt.js';

// POST multipart/form-data, field "audio" (m4a) → { text }
export default handler(async (req) => {
  if (req.method !== 'POST') throw new HttpError(405, 'Dùng POST');
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new HttpError(400, 'Body phải là multipart/form-data');
  }
  const audio = form.get('audio');
  if (!(audio instanceof File)) throw new HttpError(400, 'Thiếu field "audio"');
  const text = await transcribe(audio);
  return json({ text });
});
