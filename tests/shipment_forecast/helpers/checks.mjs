// 公開ファイルの検査器（テスト側に手書き。実装の許可リスト・判定関数は共有しない）
export const ALLOWED_TOP = ['generated_at', 'items'];
export const ALLOWED_ITEM = ['crop', 'rows'];
export const ALLOWED_ROW = ['variety', 'harvest_from', 'harvest_to', 'status', 'section', 'count_label'];
export const STATUSES = ['seedling', 'growing', 'bud', 'harvesting'];
export const SECTIONS = ['shipping', 'soon', 'later'];
export const COUNT_RE = /^(100本未満|約[1-9]00本|約[1-9]千本|約[1-9]万本|約[1-9]万[1-9]千本)$/;
const MONTH_RE = /^\d{4}-\d{2}$/;
const JST_DT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/;

function walk(value, visit, where = '$') {
  visit(value, where);
  if (Array.isArray(value)) value.forEach((v, i) => walk(v, visit, `${where}[${i}]`));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) walk(v, visit, `${where}.${k}`);
}

export function checkP1(f) {
  const bad = [];
  const extra = (obj, allowed, where) => {
    for (const k of Object.keys(obj)) if (!allowed.includes(k)) bad.push(`extra_key:${k}@${where}`);
  };
  extra(f, ALLOWED_TOP, 'top');
  for (const it of f.items ?? []) {
    extra(it, ALLOWED_ITEM, 'item');
    for (const r of it.rows ?? []) extra(r, ALLOWED_ROW, 'row');
  }
  return bad;
}
export function checkP2(f) {
  const bad = [];
  walk(f, (v, where) => {
    if (typeof v === 'number') bad.push(`number@${where}`);
  });
  return bad;
}
export function checkP3(text, markers) {
  return markers.filter((m) => text.includes(String(m))).map((m) => `marker:${m}`);
}
// 生の本数の数字が count_label 以外のどこにも出ない／count_label が許される形
export function checkP4(f, rawNumbers) {
  const bad = [];
  for (const it of f.items ?? []) {
    for (const r of it.rows ?? []) {
      for (const [k, v] of Object.entries({ crop: it.crop, ...r })) {
        if (k === 'count_label') continue;
        for (const n of rawNumbers) if (typeof v === 'string' && v.includes(String(n))) bad.push(`raw_count:${n}@${k}`);
      }
      if (r.count_label !== null && !COUNT_RE.test(String(r.count_label))) bad.push(`bad_count_label:${r.count_label}`);
    }
  }
  return bad;
}
export function checkP5(f) {
  const bad = [];
  walk(f, (v, where) => {
    if (typeof v === 'string' && /\d{4}-\d{2}-\d{2}/.test(v) && where !== '$.generated_at') bad.push(`day_date:${v}@${where}`);
  });
  for (const it of f.items ?? []) {
    for (const r of it.rows ?? []) {
      if (!MONTH_RE.test(String(r.harvest_from))) bad.push(`bad_harvest_from:${r.harvest_from}`);
      if (r.harvest_to !== null && !MONTH_RE.test(String(r.harvest_to))) bad.push(`bad_harvest_to:${r.harvest_to}`);
    }
  }
  return bad;
}
export function checkP6(text) {
  return [...text.matchAll(/(?<![0-9])20[0-9]{4}(?![0-9])/g)].map((m) => `cultivation_no_shape:${m[0]}`);
}
export function checkP8(f, { crops, varieties }) {
  const bad = [];
  if (!JST_DT_RE.test(String(f.generated_at))) bad.push(`generated_at:${f.generated_at}`);
  for (const it of f.items ?? []) {
    if (!crops.has(it.crop)) bad.push(`crop:${it.crop}`);
    for (const r of it.rows ?? []) {
      if (r.variety !== null && !varieties.has(r.variety)) bad.push(`variety:${r.variety}`);
      if (!MONTH_RE.test(String(r.harvest_from))) bad.push(`harvest_from:${r.harvest_from}`);
      if (r.harvest_to !== null && !MONTH_RE.test(String(r.harvest_to))) bad.push(`harvest_to:${r.harvest_to}`);
      if (!STATUSES.includes(r.status)) bad.push(`status:${r.status}`);
      if (!SECTIONS.includes(r.section)) bad.push(`section:${r.section}`);
      if (r.count_label !== null && !COUNT_RE.test(String(r.count_label))) bad.push(`count_label:${r.count_label}`);
    }
  }
  return bad;
}

// P11：テスト用データに実在しうる番号・利用者IDらしき文字列・鍵らしき文字列が無いか
export function scanFixtureText(text) {
  const bad = [];
  for (const m of text.matchAll(/(?<![0-9])20[0-9]{4}(?![0-9])/g)) if (!m[0].startsWith('2099')) bad.push(`real_looking_no:${m[0]}`);
  for (const m of text.matchAll(/(?<![A-Za-z0-9])[A-Za-z0-9]{26,30}(?![A-Za-z0-9])/g)) bad.push(`user_id_like:${m[0]}`);
  for (const w of ['private_key', 'BEGIN PRIVATE KEY', 'client_email', 'iam.gserviceaccount.com']) if (text.includes(w)) bad.push(`key_like:${w}`);
  for (const m of text.matchAll(/AIza[0-9A-Za-z_-]{10,}/g)) bad.push(`key_like:${m[0]}`);
  return bad;
}

export function getPath(obj, p) {
  return p
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .reduce((o, k) => (o === null || o === undefined ? undefined : o[k]), obj);
}
