// 出荷予報の書き出し部品：載せる/外すの判定・状態と区分・本数の丸め・公開ファイルの形（設計 §3〜§6）
// 副作用なし・時計を見ない。基準日は写しの generated_for_date、generated_at は写しのまま写す。
// 公開は許可リスト方式：写しから読むのは下で明示した項目だけで、元データをそのまま通さない。
// 警告は {kind, cultivation_no, field?} だけ（本数・場所・名前などの値は入れない）
import { isFilledString, isObject, missingRequiredFields, parseDateOnly } from './fields.mjs';

const collator = new Intl.Collator('ja');

const BUD_WORDS = ['つぼみ', '蕾', '発蕾'];
const SEEDLING_WORDS = ['育苗', '播種', '発芽', '挿し穂', '発根', '苗立ち', '直播'];

const monthKey = (d) => `${String(d.year).padStart(4, '0')}-${String(d.month).padStart(2, '0')}`;
const monthIndex = (d) => d.year * 12 + (d.month - 1);

// 本数 → 表示（設計 §5.3）。整数の計算で四捨五入する（小数の誤差を持ち込まない）
function countLabel(n) {
  if (n === null || n <= 0) return null;
  if (n < 100) return '100本未満';
  if (n < 1000) {
    const hundreds = Math.floor((n + 50) / 100); // 1〜10
    return hundreds >= 10 ? '約1千本' : `約${hundreds}00本`;
  }
  const thousands = Math.floor((n + 500) / 1000);
  if (thousands < 10) return `約${thousands}千本`;
  const man = Math.floor(thousands / 10);
  const rest = thousands % 10;
  return rest === 0 ? `約${man}万本` : `約${man}万${rest}千本`;
}

// 本数として読めるか。{ value: 数 or null, unreadable: bool }。null・欠落は「本数なし」（警告なし）
function readCount(v) {
  if (v === null || v === undefined) return { value: null, unreadable: false };
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return { value: null, unreadable: true };
  return { value: v, unreadable: false };
}

const includesAny = (name, words) => typeof name === 'string' && words.some((w) => name.includes(w));

function rowStatus(isHarvesting, stageName) {
  if (isHarvesting) return 'harvesting';
  if (includesAny(stageName, BUD_WORDS)) return 'bud';
  if (includesAny(stageName, SEEDLING_WORDS)) return 'seedling';
  return 'growing';
}

const stageNameOf = (stage) => (isObject(stage) && typeof stage.stage_name === 'string' ? stage.stage_name : null);

function varietyNameOf(v) {
  if (!isObject(v) || !isFilledString(v.variety_name)) return null;
  return v.variety_name;
}
const isSeries = (name) => typeof name === 'string' && name.endsWith('シリーズ');

const cmpNullLast = (a, b) => {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return collator.compare(a, b);
};
const cmpPlain = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const tail = (r) => JSON.stringify([r.harvest_to, r.status, r.section, r.count_label]);

// 行の並び：収穫開始の月 → 品種名（品種名なしは最後）→ その他の項目（入力の並びに依らない全順序）
function compareRows(a, b) {
  return cmpPlain(a.harvest_from, b.harvest_from) || cmpNullLast(a.variety, b.variety) || cmpPlain(tail(a), tail(b));
}

export function buildForecast(snapshot, hiddenEntries) {
  const warnings = [];
  const warn = (kind, no, field) => {
    const w = { kind, cultivation_no: no ?? null };
    if (field !== undefined) w.field = field;
    warnings.push(w);
  };

  const base = parseDateOnly(snapshot.generated_for_date);
  const baseIdx = monthIndex(base);
  const cultivations = snapshot.main.cultivations;

  const hiddenNos = new Set((hiddenEntries ?? []).map((e) => String(e.cultivation_no)));
  const seenNos = new Set();
  const byCrop = new Map();

  for (const c of cultivations) {
    if (!isObject(c)) {
      warn('not_an_object', null);
      continue;
    }
    const hasNo =
      (typeof c.cultivation_no === 'string' && c.cultivation_no.trim() !== '') ||
      (typeof c.cultivation_no === 'number' && Number.isFinite(c.cultivation_no));
    if (!hasNo) {
      warn('cultivation_no_missing', null); // 一覧と突き合わせられないので載せない側に倒す
      continue;
    }
    const no = String(c.cultivation_no);
    seenNos.add(no);
    if (hiddenNos.has(no)) continue; // 載せない一覧にある作付けは外す（警告も出さない）

    // 作付けを始めていない（planned）は正常な絞り込み。警告は出さない
    if (c.status === 'planned') continue;

    // 不備（外して警告）。status は写しのまま使い、日付から推定しない
    let defective = false;
    const defect = (kind, field) => {
      warn(kind, no, field);
      defective = true;
    };
    if (!isFilledString(c.flower_type)) defect('crop_missing');
    let start = null;
    if (!isFilledString(c.harvest_start)) defect('harvest_start_missing');
    else {
      start = parseDateOnly(c.harvest_start);
      if (!start) defect('harvest_start_unreadable');
    }
    if (!isFilledString(c.status)) defect('required_field_missing', 'status');
    else if (c.status !== 'active' && c.status !== 'harvesting') defect('status_unexpected');
    for (const field of missingRequiredFields(c)) {
      if (field === 'variety_counts_usable' || field === 'varieties' || field === 'current_stage') {
        defect('required_field_missing', field);
      }
    }
    if (defective) continue;

    const isHarvesting = c.status === 'harvesting';

    // 収穫の終わり
    let harvestTo = null;
    const end = isFilledString(c.harvest_end) ? parseDateOnly(c.harvest_end) : null;
    if (end) {
      if (c.harvest_end < c.harvest_start) {
        warn('harvest_end_before_start', no); // 壊れた値：終わりの月なしで載せる
      } else if (monthIndex(end) < baseIdx) {
        if (!isHarvesting) continue; // 終わりが先月以前で収穫中でない → 外す（不備ではない）
        warn('harvest_end_past_while_harvesting', no);
      } else {
        harvestTo = monthKey(end);
      }
    }

    const section = isHarvesting ? 'shipping' : monthIndex(start) - baseIdx <= 1 ? 'soon' : 'later';
    const harvestFrom = monthKey(start);

    const varieties = c.varieties.filter(isObject);
    const rows = [];
    const makeRow = (variety, count, stageName) =>
      rows.push({
        variety,
        harvest_from: harvestFrom,
        harvest_to: harvestTo,
        status: rowStatus(isHarvesting, stageName),
        section,
        count_label: countLabel(count),
      });
    const readCounted = (v) => {
      const r = readCount(v);
      if (r.unreadable) warn('count_unreadable', no);
      return r.value;
    };

    if (c.variety_counts_usable) {
      // 品種ごとに1行（「シリーズ」で終わる品種は行ごと除く）
      const kept = varieties.filter((v) => !isSeries(varietyNameOf(v)));
      const counts = kept.map((v) => readCounted(v.planned_count));
      kept.forEach((v, i) => makeRow(varietyNameOf(v), counts[i], stageNameOf(v.current_stage_effective)));
      const positive = counts.filter((n) => n !== null && n > 0);
      if (positive.length === 0) {
        warn('flag_mismatch', no);
      } else {
        const total = readCount(c.planned_count_total).value;
        const sum = positive.reduce((a, b) => a + b, 0);
        if (total !== null && sum !== total) warn('variety_total_mismatch', no);
      }
    } else {
      // 品種ごとの本数が使えない：総数の1行（品種名は「・」でつなぐ）
      const names = varieties.map(varietyNameOf).filter((n) => n !== null && !isSeries(n));
      const anyPositive = varieties.some((v) => {
        const r = readCount(v.planned_count);
        return r.value !== null && r.value > 0;
      });
      if (anyPositive) warn('flag_mismatch', no);
      const total = readCounted(c.planned_count_total);
      makeRow(names.length > 0 ? names.join('・') : null, total, stageNameOf(c.current_stage.representative));
    }

    const list = byCrop.get(c.flower_type) ?? [];
    list.push(...rows);
    byCrop.set(c.flower_type, list);
  }

  for (const e of hiddenEntries ?? []) {
    if (!seenNos.has(String(e.cultivation_no))) warn('hidden_no_match', String(e.cultivation_no));
  }

  // 品目の並び：その品目の行のいちばん早い収穫開始の月 → 品目名（日本語の標準の並び）
  const items = [...byCrop.entries()]
    .filter(([, rows]) => rows.length > 0)
    .map(([crop, rows]) => ({ crop, rows: rows.sort(compareRows) }))
    .sort((a, b) => cmpPlain(a.rows[0].harvest_from, b.rows[0].harvest_from) || collator.compare(a.crop, b.crop));

  return { forecast: { generated_at: snapshot.generated_at, items }, warnings };
}

// 書き出し文字列：インデント2・LF・末尾改行1つ。キーの並びは組み立てた順（設計 §6.2）
export function serializeForecast(forecast) {
  return `${JSON.stringify(forecast, null, 2)}\n`;
}
