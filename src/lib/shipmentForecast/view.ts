// 出荷予報ページの「表示用の形」を作る純粋な関数（段2）。
// ファイル読み・Astro には依存しない。

export type ForecastStatus = 'seedling' | 'growing' | 'bud' | 'harvesting';
export type ForecastSection = 'shipping' | 'soon' | 'later';

export interface ForecastRow {
  variety: string | null;
  harvest_from: string;
  harvest_to: string | null;
  status: ForecastStatus;
  section: ForecastSection;
  count_label: string | null;
}

export interface ForecastItem {
  crop: string;
  rows: ForecastRow[];
}

export interface Forecast {
  generated_at: string;
  items: ForecastItem[];
}

export interface PhotoEntry {
  src: string;
  alt: string;
}

export interface PhotoMap {
  crops: Record<string, PhotoEntry & { varieties?: Record<string, PhotoEntry> }>;
}

export interface ViewRow {
  variety: string | null;
  months: string;
  statusLabel: string;
  countLabel: string | null;
}

export interface ViewItem {
  crop: string;
  photo: PhotoEntry | null;
  contactHref: string;
  rows: ViewRow[];
}

export interface ViewSection {
  key: ForecastSection;
  title: string;
  items: ViewItem[];
}

export type ForecastView =
  | { state: 'missing' }
  | { state: 'empty'; asOf: string; generatedAt: string }
  | { state: 'present'; asOf: string; generatedAt: string; sections: ViewSection[] };

const GENERATED_AT_RE = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}\+09:00$/;
const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const STATUSES: readonly ForecastStatus[] = ['seedling', 'growing', 'bud', 'harvesting'];
const SECTIONS: readonly ForecastSection[] = ['shipping', 'soon', 'later'];

const SECTION_TITLES: Record<ForecastSection, string> = {
  shipping: '出荷中',
  soon: 'もうすぐ',
  later: 'これから',
};
const STATUS_LABELS: Record<ForecastStatus, string> = {
  seedling: '育苗・植え付け前',
  growing: '生育中',
  bud: 'つぼみ',
  harvesting: '収穫中',
};

const collator = new Intl.Collator('ja');

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

function fail(what: string): never {
  throw new Error(`出荷予報ファイルの形が違います: ${what}`);
}

function stringOrNull(v: unknown, what: string): string | null {
  if (v === null) return null;
  if (typeof v !== 'string') fail(what);
  return v;
}

export function parseForecast(raw: unknown): Forecast {
  if (!isObj(raw)) fail('最上位がオブジェクトでない');
  const generated_at = raw.generated_at;
  if (typeof generated_at !== 'string' || !GENERATED_AT_RE.test(generated_at)) fail('generated_at');
  const rawItems = raw.items;
  if (!Array.isArray(rawItems)) fail('items が配列でない');
  const items: ForecastItem[] = rawItems.map((it, i) => {
    if (!isObj(it)) fail(`items[${i}]`);
    const crop = it.crop;
    if (typeof crop !== 'string' || crop === '') fail(`items[${i}].crop`);
    const rawRows = it.rows;
    if (!Array.isArray(rawRows) || rawRows.length < 1) fail(`items[${i}].rows`);
    const rows: ForecastRow[] = rawRows.map((r, j) => {
      const where = `items[${i}].rows[${j}]`;
      if (!isObj(r)) fail(where);
      const harvest_from = r.harvest_from;
      if (typeof harvest_from !== 'string' || !MONTH_RE.test(harvest_from)) fail(`${where}.harvest_from`);
      const harvest_to = stringOrNull(r.harvest_to, `${where}.harvest_to`);
      if (harvest_to !== null && !MONTH_RE.test(harvest_to)) fail(`${where}.harvest_to`);
      const status = r.status;
      if (typeof status !== 'string' || !STATUSES.includes(status as ForecastStatus)) fail(`${where}.status`);
      const section = r.section;
      if (typeof section !== 'string' || !SECTIONS.includes(section as ForecastSection)) fail(`${where}.section`);
      return {
        variety: stringOrNull(r.variety, `${where}.variety`),
        harvest_from,
        harvest_to,
        status: status as ForecastStatus,
        section: section as ForecastSection,
        count_label: stringOrNull(r.count_label, `${where}.count_label`),
      };
    });
    return { crop, rows };
  });
  return { generated_at, items };
}

// 日付は文字列から読む（Date に変換しない＝実行する場所の時刻帯に左右されない）
export function formatAsOf(generatedAt: string): string {
  const m = GENERATED_AT_RE.exec(generatedAt);
  if (!m) fail('generated_at');
  return `${Number(m[2])}月${Number(m[3])}日 朝の時点`;
}

function splitMonth(ym: string): { y: number; m: number } {
  const m = MONTH_RE.exec(ym);
  if (!m) fail(`月の形が違う: ${ym}`);
  return { y: Number(m[1]), m: Number(m[2]) };
}

export function formatHarvestMonths(from: string, to: string | null, baseYear: number): string {
  const f = splitMonth(from);
  const head = `${f.y === baseYear ? '' : `${f.y}年`}${f.m}月`;
  if (to === null) return `${head}から`;
  const t = splitMonth(to);
  if (t.y === f.y && t.m === f.m) return head;
  // 終わりの年は、始まりと違う年のときだけ添える（「2025年12月〜2月」の読み違い防止）
  return `${head}〜${t.y === f.y ? '' : `${t.y}年`}${t.m}月`;
}

function compareRows(a: ForecastRow, b: ForecastRow): number {
  if (a.harvest_from !== b.harvest_from) return a.harvest_from < b.harvest_from ? -1 : 1;
  if (a.variety === null && b.variety !== null) return 1;
  if (a.variety !== null && b.variety === null) return -1;
  if (a.variety !== null && b.variety !== null) {
    const c = collator.compare(a.variety, b.variety);
    if (c !== 0) return c;
  }
  const to = (a.harvest_to ?? '9999-99').localeCompare(b.harvest_to ?? '9999-99');
  if (to !== 0) return to;
  const st = STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status);
  if (st !== 0) return st;
  return (a.count_label ?? '').localeCompare(b.count_label ?? '');
}

function pickPhoto(crop: string, rows: ForecastRow[], photos: PhotoMap): PhotoEntry | null {
  const entry = Object.hasOwn(photos.crops, crop) ? photos.crops[crop] : undefined;
  if (!entry) return null;
  const names = new Set(rows.map((r) => r.variety));
  if (names.size === 1) {
    const only = [...names][0];
    if (only !== null && entry.varieties && Object.hasOwn(entry.varieties, only)) {
      const v = entry.varieties[only];
      return { src: v.src, alt: v.alt };
    }
  }
  return { src: entry.src, alt: entry.alt };
}

export function buildForecastView(input: { forecast: Forecast | null; photos: PhotoMap }): ForecastView {
  const { forecast, photos } = input;
  if (forecast === null) return { state: 'missing' };
  const generatedAt = forecast.generated_at;
  const asOf = formatAsOf(generatedAt);
  if (forecast.items.length === 0) return { state: 'empty', asOf, generatedAt };
  const baseYear = Number(generatedAt.slice(0, 4));

  const sections: ViewSection[] = [];
  for (const key of SECTIONS) {
    const byCrop = new Map<string, ForecastRow[]>();
    for (const it of forecast.items) {
      const rows = it.rows.filter((r) => r.section === key);
      if (rows.length === 0) continue;
      byCrop.set(it.crop, [...(byCrop.get(it.crop) ?? []), ...rows]);
    }
    if (byCrop.size === 0) continue;
    const entries = [...byCrop.entries()].map(([crop, rows]) => ({ crop, rows: [...rows].sort(compareRows) }));
    entries.sort((a, b) => {
      const ea = a.rows[0].harvest_from;
      const eb = b.rows[0].harvest_from;
      if (ea !== eb) return ea < eb ? -1 : 1;
      return collator.compare(a.crop, b.crop);
    });
    sections.push({
      key,
      title: SECTION_TITLES[key],
      items: entries.map(({ crop, rows }) => ({
        crop,
        photo: pickPhoto(crop, rows, photos),
        contactHref: '/contact',
        rows: rows.map((r) => ({
          variety: r.variety,
          months: formatHarvestMonths(r.harvest_from, r.harvest_to, baseYear),
          statusLabel: STATUS_LABELS[r.status],
          countLabel: r.count_label,
        })),
      })),
    });
  }
  return { state: 'present', asOf, generatedAt, sections };
}
