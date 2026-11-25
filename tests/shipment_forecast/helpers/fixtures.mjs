// 見本（fixtures/）の読み込みと、見本どうしを合わせる道具
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HELPERS_DIR = path.dirname(fileURLToPath(import.meta.url));
export const TESTS_DIR = path.resolve(HELPERS_DIR, '..');
export const ROOT = path.resolve(HELPERS_DIR, '../../..');
export const FIXTURE_DIR = path.join(TESTS_DIR, 'fixtures');

const SF_FILES = {
  1: 'sf01_torukokikyo_bud.json',
  2: 'sf02_campanula_harvesting.json',
  3: 'sf03_torukokikyo_mismatch.json',
  4: 'sf04_stock_partial_counts.json',
  5: 'sf05_end_before_start.json',
  6: 'sf06_himawari_ratio.json',
  7: 'sf07_legacy_normalized.json',
  8: 'sf08_empty_varieties.json',
  9: 'sf09_harvest_start_missing.json',
  10: 'sf10_sentinels.json',
};

export function sfText(n) {
  return fs.readFileSync(path.join(FIXTURE_DIR, SF_FILES[n]), 'utf8');
}
export function sf(n) {
  return JSON.parse(sfText(n));
}
export function prevPublishedText() {
  return fs.readFileSync(path.join(FIXTURE_DIR, 'prev_published.json'), 'utf8');
}

// 最初の写しの表紙に、残りの写しの作付けを足して1つの写しにする
export function combine(...snaps) {
  const out = structuredClone(snaps[0]);
  out.main.cultivations = snaps.flatMap((s) => structuredClone(s.main.cultivations));
  return out;
}
// 陽性の土台：SF1〜SF6
export function baseSnapshot() {
  return combine(sf(1), sf(2), sf(3), sf(4), sf(5), sf(6));
}
// 全部：SF10 の表紙（その他作物・今週の作業の目印つき）。作付けは SF10 の2件→SF1〜SF9 の順（SF10 を二重に入れない）
export function allSnapshot() {
  return combine(sf(10), sf(1), sf(2), sf(3), sf(4), sf(5), sf(6), sf(7), sf(8), sf(9));
}
