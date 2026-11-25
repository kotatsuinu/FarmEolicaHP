// 出荷予報の書き出し部品：写しの値を読む小さな道具（snapshot.mjs と forecast.mjs が共有する）
// 値そのものはどこにも出さない（真偽・型の判定だけ）

export const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// 空文字・空白だけ・null・欠落ではない文字列か
export const isFilledString = (v) => typeof v === 'string' && v.trim() !== '';

// YYYY-MM-DD で、暦に実在する日付か（時刻帯・Date の解釈に頼らない）
export function parseDateOnly(value) {
  if (typeof value !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1) return null;
  const daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  if (d > daysInMonth) return null;
  return { year: y, month: mo, day: d };
}

// 設計 §2.3 の 10：作付け1件の必須項目のうち、空・欠落のものの名前
// （品目名・収穫開始・status・variety_counts_usable・varieties・current_stage）
export function missingRequiredFields(c) {
  if (!isObject(c)) return ['flower_type', 'harvest_start', 'status', 'variety_counts_usable', 'varieties', 'current_stage'];
  const missing = [];
  if (!isFilledString(c.flower_type)) missing.push('flower_type');
  if (!isFilledString(c.harvest_start)) missing.push('harvest_start');
  if (!isFilledString(c.status)) missing.push('status');
  if (typeof c.variety_counts_usable !== 'boolean') missing.push('variety_counts_usable');
  if (!Array.isArray(c.varieties)) missing.push('varieties');
  if (!isObject(c.current_stage)) missing.push('current_stage');
  return missing;
}
