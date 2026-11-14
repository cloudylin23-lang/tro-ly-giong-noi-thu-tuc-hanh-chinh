// Kiểm tra dữ liệu thủ tục trong src/data/procedures/*.json — chạy trong CI và trước khi mở PR:
//   npm run check:data
// TypeScript không bắt được lỗi trong JSON (vì ép kiểu `as Procedure[]`), nên script này kiểm tra thay.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = fileURLToPath(new URL('../src/data/procedures/', import.meta.url));
const KINDS = ['text', 'date', 'id12', 'phone', 'gender', 'email', 'choice'];
const FORMS = ['CT01', 'DC02'];
const EXTRA_FORMS = ['MAU02'];

const errors = [];
const warnings = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);
const warn = (file, msg) => warnings.push(`${file}: ${msg}`);
const isStr = (v) => typeof v === 'string' && v.trim() !== '';

const index = readFileSync(join(DIR, 'index.ts'), 'utf8');
const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));
const ids = new Map();

for (const file of files) {
  let p;
  try {
    p = JSON.parse(readFileSync(join(DIR, file), 'utf8'));
  } catch (e) {
    err(file, `JSON không hợp lệ — ${e.message}`);
    continue;
  }

  if (!index.includes(`./${file}`)) err(file, `chưa được import trong index.ts`);

  for (const k of ['id', 'name', 'formTitle', 'source']) if (!isStr(p[k])) err(file, `thiếu "${k}"`);
  if (p.id) {
    if (ids.has(p.id)) err(file, `id "${p.id}" trùng với ${ids.get(p.id)}`);
    ids.set(p.id, file);
  }
  if (p.form !== undefined && !FORMS.includes(p.form)) err(file, `form "${p.form}" không hỗ trợ (chỉ ${FORMS.join(', ')})`);
  if (!Array.isArray(p.aliases) || p.aliases.length === 0) err(file, `cần ít nhất 1 "aliases"`);
  if (!Array.isArray(p.documents)) err(file, `thiếu "documents" (mảng)`);
  for (const k of ['name', 'address', 'hours']) if (!isStr(p.office?.[k])) err(file, `thiếu "office.${k}"`);
  if (/CẦN CẬP NHẬT|BẢN NHÁP/i.test(JSON.stringify(p))) warn(file, `còn chữ "CẦN CẬP NHẬT"/"BẢN NHÁP"`);

  if (!Array.isArray(p.fields) || p.fields.length === 0) {
    err(file, `cần ít nhất 1 field`);
    continue;
  }
  const seen = new Map(); // key → field (chỉ các field đứng TRƯỚC)
  for (const [i, f] of p.fields.entries()) {
    const at = `fields[${i}]${f?.key ? ` (${f.key})` : ''}`;
    if (!/^[a-z][a-z0-9_]*$/.test(f.key ?? '')) err(file, `${at}: key phải viết thường, không dấu, dùng _`);
    if (seen.has(f.key)) err(file, `${at}: key trùng`);
    if (!KINDS.includes(f.kind)) err(file, `${at}: kind "${f.kind}" không hợp lệ (${KINDS.join(', ')})`);
    if (!isStr(f.label)) err(file, `${at}: thiếu label`);
    if (!isStr(f.question)) err(file, `${at}: thiếu question`);

    if (f.kind === 'choice') {
      const opts = Array.isArray(f.options) ? f.options : [];
      if (opts.length < 2) err(file, `${at}: kind=choice cần ít nhất 2 options`);
      const values = opts.map((o) => o.value);
      if (new Set(values).size !== values.length) err(file, `${at}: options có value trùng`);
      for (const o of opts) {
        if (!/^[a-z][a-z0-9_]*$/.test(o.value ?? '')) err(file, `${at}: option value "${o.value}" phải viết thường, không dấu`);
        if (!isStr(o.label)) err(file, `${at}: option "${o.value}" thiếu label`);
        if (o.documents !== undefined && !Array.isArray(o.documents)) err(file, `${at}: option "${o.value}" documents phải là mảng`);
      }
    } else if (f.options !== undefined) {
      warn(file, `${at}: có options nhưng kind không phải choice`);
    }

    if (f.when) {
      const dep = seen.get(f.when.field);
      if (!dep) err(file, `${at}: when.field "${f.when.field}" phải là field choice đứng TRƯỚC`);
      else if (dep.kind !== 'choice') err(file, `${at}: when.field "${f.when.field}" phải có kind=choice`);
      else {
        const ok = new Set(dep.options.map((o) => o.value));
        for (const v of f.when.in ?? []) if (!ok.has(v)) err(file, `${at}: when.in có "${v}" không nằm trong options của ${dep.key}`);
        if (!Array.isArray(f.when.in) || f.when.in.length === 0) err(file, `${at}: when.in cần ít nhất 1 giá trị`);
      }
    }
    seen.set(f.key, f);
  }

  for (const [i, x] of (p.extraForms ?? []).entries()) {
    const at = `extraForms[${i}]`;
    if (!EXTRA_FORMS.includes(x.form)) err(file, `${at}: form "${x.form}" không hỗ trợ (chỉ ${EXTRA_FORMS.join(', ')})`);
    if (!isStr(x.title)) err(file, `${at}: thiếu title`);
    const dep = seen.get(x.when?.field);
    if (!dep || dep.kind !== 'choice') err(file, `${at}: when.field "${x.when?.field}" phải là field choice`);
    else for (const v of x.when.in ?? []) if (!dep.options.some((o) => o.value === v)) err(file, `${at}: when.in có "${v}" không nằm trong options của ${dep.key}`);
  }
}

for (const w of warnings) console.warn(`⚠️  ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`❌ ${e}`);
  console.error(`\n${errors.length} lỗi trong dữ liệu thủ tục.`);
  process.exit(1);
}
console.log(`✅ ${files.length} thủ tục hợp lệ: ${[...ids.keys()].join(', ')}`);
