// Chạy thử prompt hàng loạt, không cần điện thoại: npm run samples
// Sửa prompt trong prompts/ rồi chạy lại để so sánh. Đổi OPENAI_MODEL trong .env.local để so tốc độ.
import { existsSync, readFileSync } from 'node:fs';
import { runTurn } from '../lib/turn.js';
import { config } from '../lib/openai.js';
import type { ClassifyResponse, ExtractResponse, FieldSpec, ProcedureBrief } from '../lib/types.js';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

// Dùng chính dữ liệu thủ tục của app để test sát thực tế
const load = (name: string) =>
  JSON.parse(readFileSync(new URL(`../../mobile/src/data/procedures/${name}.json`, import.meta.url), 'utf8'));
const procedures = [load('tam-tru'), load('thuong-tru'), load('cap-lai-can-cuoc')] as (ProcedureBrief & { fields: FieldSpec[] })[];
const tamTru = procedures[0];

const samples = JSON.parse(readFileSync(new URL('./samples.json', import.meta.url), 'utf8')) as {
  classify: { utterance: string; expect: string | null }[];
  extract: { field: string; utterance: string; expect: Record<string, string>; expectAct?: string }[];
};

let pass = 0;
let total = 0;
const times: number[] = [];

async function timed<T>(fn: () => Promise<T>): Promise<[T, number]> {
  const t = Date.now();
  const r = await fn();
  const ms = Date.now() - t;
  times.push(ms);
  return [r, ms];
}

console.log(`Model: ${config.llmModel}${config.reasoningEffort ? ` (reasoning ${config.reasoningEffort})` : ''}\n`);
console.log('== CLASSIFY ==');
for (const s of samples.classify) {
  total++;
  const [r, ms] = await timed(
    () =>
      runTurn({
        mode: 'classify',
        utterance: s.utterance,
        procedures: procedures.map(({ id, name, aliases }) => ({ id, name, aliases })),
      }) as Promise<ClassifyResponse>,
  );
  const ok = r.procedureId === s.expect;
  if (ok) pass++;
  console.log(`${ok ? '✅' : '❌'} ${ms}ms  "${s.utterance}" → ${r.procedureId} (mong đợi ${s.expect})\n   ${r.reply}`);
}

console.log('\n== EXTRACT ==');
for (const s of samples.extract) {
  total++;
  const current = tamTru.fields.find((f) => f.key === s.field)!;
  const others = tamTru.fields.filter((f) => f.key !== s.field);
  const [r, ms] = await timed(
    () =>
      runTurn({
        mode: 'extract',
        utterance: s.utterance,
        procedureName: tamTru.name,
        currentField: current,
        otherFields: others,
      }) as Promise<ExtractResponse>,
  );
  const got = Object.fromEntries(r.values.map((v) => [v.key, v.value]));
  const valuesOk =
    Object.keys(got).length === Object.keys(s.expect).length &&
    Object.entries(s.expect).every(([k, v]) => got[k] === v);
  const actOk = !s.expectAct || r.act === s.expectAct;
  const ok = valuesOk && actOk;
  if (ok) pass++;
  console.log(
    `${ok ? '✅' : '❌'} ${ms}ms  [${s.field}] "${s.utterance}"\n   act=${r.act} values=${JSON.stringify(got)}` +
      (ok ? '' : `\n   mong đợi act=${s.expectAct ?? '*'} values=${JSON.stringify(s.expect)}`) +
      `\n   ${r.reply}`,
  );
}

times.sort((a, b) => a - b);
const p50 = times[Math.floor(times.length / 2)];
const p90 = times[Math.floor(times.length * 0.9)];
console.log(`\nKết quả: ${pass}/${total} đúng · độ trễ p50=${p50}ms p90=${p90}ms`);
process.exit(pass === total ? 0 : 1);
