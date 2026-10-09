// Farm Eolica Works — 実績システム一覧の表示用データ
// 手書きデータ（works-systems.ts）と機械用データ（works-ledger-status.json）だけを読み、
// records.astro / index.astro が使う分類一覧・構想中の一覧・件数・最終更新日を出す。
// works-systems.ts を import してよいのはこのファイルだけ。
import { worksSystems } from './works-systems';
import ledgerStatus from './works-ledger-status.json';

export type WorksStatus = 'running' | 'developing' | 'planned';

export type WorksItem = {
  key: string;
  title: string;
  description: string;
  status: WorksStatus;
  noteUrls: string[];
};

export type WorksCategory = {
  id: string;
  label: string;
  labelEn: string;
  items: WorksItem[];
};

const STATUSES: readonly string[] = ['running', 'developing', 'planned'];

type RawEntry = { status?: unknown; noteUrls?: unknown };
const raw = ledgerStatus as { lastUpdated?: unknown; items?: unknown };

// 防波堤: 機械用データの検査（ここで例外を投げてビルドを止める。形が崩れていても空の一覧で黙って通さない）
if (typeof raw.lastUpdated !== 'string' || raw.items === null || typeof raw.items !== 'object' || Array.isArray(raw.items)) {
  throw new Error('works-ledger-status.json の形が想定と違います（lastUpdated の文字列と items のオブジェクトが必要）');
}
const rawItems = raw.items as Record<string, RawEntry>;

const handwrittenKeys = new Set(worksSystems.flatMap(c => c.items.map(i => i.key)));
const unknownKeys = Object.keys(rawItems).filter(k => !handwrittenKeys.has(k));
if (unknownKeys.length > 0) {
  throw new Error(
    `works-ledger-status.json に、works-systems.ts に無い key があります: ${unknownKeys.join(', ')}`,
  );
}
const badStatus = Object.entries(rawItems).filter(([, v]) => !STATUSES.includes(v?.status as string));
if (badStatus.length > 0) {
  throw new Error(
    `works-ledger-status.json に、status が running/developing/planned 以外の項目があります: ${badStatus
      .map(([k, v]) => `${k}=${JSON.stringify(v?.status)}`)
      .join(', ')}`,
  );
}

// 手書きの並び（分類順→項目順）で、機械用データにある項目だけ
const allCategories: WorksCategory[] = worksSystems.map(c => ({
  id: c.id,
  label: c.label,
  labelEn: c.labelEn,
  items: c.items
    .filter(i => i.key in rawItems)
    .map(i => ({
      key: i.key,
      title: i.title,
      description: i.description,
      status: rawItems[i.key].status as WorksStatus,
      noteUrls: Array.isArray(rawItems[i.key].noteUrls) ? (rawItems[i.key].noteUrls as string[]) : [],
    })),
}));

const allItems = allCategories.flatMap(c => c.items);

/** 運用中・開発中が1件以上ある分類だけ（項目も運用中・開発中のみ） */
export const shownCategories: WorksCategory[] = allCategories
  .map(c => ({ ...c, items: c.items.filter(i => i.status !== 'planned') }))
  .filter(c => c.items.length > 0);

/** 構想中の項目（手書きの並び） */
export const plannedItems: WorksItem[] = allItems.filter(i => i.status === 'planned');

export const runningCount = allItems.filter(i => i.status === 'running').length;
export const developingCount = allItems.filter(i => i.status === 'developing').length;
export const plannedCount = plannedItems.length;
export const totalCount = allItems.length;
export const lastUpdated: string = raw.lastUpdated;
