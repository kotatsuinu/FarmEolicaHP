// 段2 ファイルの読み込み（load.ts）と、公開・読み込み先の設定のテスト。
// 「ファイルが無い（ENOENT）ときだけ null。ほかの失敗は例外（ビルドを落とす）」を確かめる。
import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { row, item, forecast, GEN } from './helpers/builders.mjs';

const LOAD = '../../src/lib/shipmentForecast/load.ts';
const SITE = '../../src/config/site';

// 公開フラグ（site.ts の定数）だけを差し替えて読み込む。ほかの部分は本物
async function loadWith(published) {
  vi.resetModules();
  vi.doMock(SITE, async (importOriginal) => ({ ...(await importOriginal()), FORECAST_PUBLISHED: published }));
  return import(LOAD);
}

let dir;
beforeAll(() => {
  // パスに shipment_forecast を含めない（ビルドの層と同じ理由。例外の文の確認を取り違えないため）
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sfp-load-'));
});
afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});
const write = (name, text) => {
  const p = path.join(dir, name);
  fs.writeFileSync(p, text);
  return p;
};

describe('loadForecastFile', () => {
  test('L-0 健全性：公開フラグの差し替え（モック）が効いている（ここが崩れると下の設定の検査は意味がない）', async () => {
    const site = await (async () => {
      vi.resetModules();
      vi.doMock(SITE, async (importOriginal) => ({ ...(await importOriginal()), FORECAST_PUBLISHED: true }));
      return import(SITE);
    })();
    expect(site.FORECAST_PUBLISHED).toBe(true);
    vi.doUnmock(SITE);
  });

  test('L-1 ファイルが無い（ENOENT）ときだけ null', async () => {
    const { loadForecastFile } = await loadWith(false);
    expect(loadForecastFile(path.join(dir, 'none.json'))).toBeNull();
    expect(loadForecastFile(path.join(dir, 'no_such_dir', 'none.json'))).toBeNull();
  });

  test('L-2 正しいファイルは中身どおりに読める', async () => {
    const { loadForecastFile } = await loadWith(false);
    const f = forecast([item('ストック', [row({ variety: null, count_label: null, harvest_to: null })])]);
    const p = write('ok.json', JSON.stringify(f));
    expect(loadForecastFile(p)).toEqual(f);
  });

  test('L-3 0件のファイルは null ではなく読める（ファイル無しと区別）', async () => {
    const { loadForecastFile } = await loadWith(false);
    const p = write('zero.json', JSON.stringify(forecast([])));
    expect(loadForecastFile(p)).toEqual({ generated_at: GEN, items: [] });
  });

  test.each([
    ['不正な JSON', '{ "generated_at": '],
    ['空のファイル', ''],
    ['items が配列でない', JSON.stringify({ generated_at: GEN, items: {} })],
    ['rows が無い', JSON.stringify({ generated_at: GEN, items: [{ crop: 'ストック' }] })],
    ['日時の形が違う', JSON.stringify({ generated_at: '2026-11-13', items: [] })],
  ])('L-4 壊れている・形が違う（%s）は null ではなく例外。文に shipment_forecast を含む', async (_n, text) => {
    const { loadForecastFile } = await loadWith(false);
    const p = write('bad.json', text);
    let err = null;
    try {
      loadForecastFile(p);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    expect(String(err.message)).toMatch(/shipment_forecast(?![A-Za-z0-9_])/);
  });

  test('L-5 ENOENT 以外の読み込み失敗（ファイルの場所がフォルダ）は null ではなく例外', async () => {
    const { loadForecastFile } = await loadWith(false);
    const p = path.join(dir, 'a_directory.json');
    fs.mkdirSync(p);
    let err = null;
    try {
      loadForecastFile(p);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(Error);
    expect(String(err.message)).toMatch(/shipment_forecast(?![A-Za-z0-9_])/);
  });
});

describe('resolveForecastSettings', () => {
  test.each([
    ['環境変数なし', {}, false],
    ['FORECAST_PREVIEW=true', { FORECAST_PREVIEW: 'true' }, true],
    ['FORECAST_PREVIEW=TRUE（大文字は偽）', { FORECAST_PREVIEW: 'TRUE' }, false],
    ['FORECAST_PREVIEW=1（偽）', { FORECAST_PREVIEW: '1' }, false],
    ['FORECAST_PREVIEW=false', { FORECAST_PREVIEW: 'false' }, false],
    ['FORECAST_PREVIEW 空文字', { FORECAST_PREVIEW: '' }, false],
    ['FORECAST_PREVIEW 未定義', { FORECAST_PREVIEW: undefined }, false],
  ])('C-1 公開フラグが偽のとき：%s → published=%s', async (_n, env, expected) => {
    const { resolveForecastSettings } = await loadWith(false);
    expect(resolveForecastSettings(env).published).toBe(expected);
  });

  test.each([
    ['環境変数なし', {}],
    ['FORECAST_PREVIEW=false でも', { FORECAST_PREVIEW: 'false' }],
  ])('C-2 公開フラグ（site.ts）が真なら環境変数に関わらず published=true（%s）', async (_n, env) => {
    const { resolveForecastSettings } = await loadWith(true);
    expect(resolveForecastSettings(env).published).toBe(true);
  });

  test('C-3 読み込み先：FORECAST_DATA_FILE があればそのまま', async () => {
    const { resolveForecastSettings } = await loadWith(false);
    const p = path.join(dir, 'custom.json');
    expect(resolveForecastSettings({ FORECAST_DATA_FILE: p }).dataFile).toBe(p);
  });

  test('C-4 読み込み先：無ければ <cwd>/src/data/shipment_forecast.json', async () => {
    const { resolveForecastSettings } = await loadWith(false);
    const expected = path.join(process.cwd(), 'src', 'data', 'shipment_forecast.json');
    expect(path.normalize(resolveForecastSettings({}).dataFile)).toBe(path.normalize(expected));
  });

  test('C-5 返す項目は published と dataFile の2つだけ', async () => {
    const { resolveForecastSettings } = await loadWith(false);
    expect(Object.keys(resolveForecastSettings({})).sort()).toEqual(['dataFile', 'published']);
  });

  test('C-6 結線：本物の site.ts の値がそのまま published に出る（モックなし）', async () => {
    vi.resetModules();
    vi.doUnmock(SITE);
    const { FORECAST_PUBLISHED } = await import(SITE);
    const { resolveForecastSettings } = await import(LOAD);
    expect(resolveForecastSettings({}).published).toBe(FORECAST_PUBLISHED === true);
  });
});
