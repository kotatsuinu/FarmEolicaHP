// 段2 本番の通り道：本物のビルドを回して確かめる（V17・V20〜V23・目印・meta）。遅い・重い層。
//   流し方: npm run test:build（vitest の page-build 層。ほかの層とは同時に走らせない）
// ・見本のファイルは src/data/ に書かない。FORECAST_DATA_FILE でリポジトリの外の一時ファイルを指す
// ・出力先は --outDir でリポジトリの外の一時フォルダ
// ・失敗の確認は「終了コード≠0」かつ「出力に shipment_forecast という名前の例外文が出ている」の両方（無関係な失敗で緑にしない）
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildForecast, serializeForecast } from '../../scripts/shipment_forecast/forecast.mjs';
import { baseSnapshot, allSnapshot } from '../shipment_forecast/helpers/fixtures.mjs';
import { NON_PUBLIC } from '../shipment_forecast/helpers/expected.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ASTRO = path.join(ROOT, 'node_modules', 'astro', 'astro.js');
// shipment_forecast という名前が単独で出ている（shipment_forecast_photos など別ファイルの名前は数えない）
const NAMED_RE = /shipment_forecast(?![A-Za-z0-9_])/;

let work; // 一時フォルダ（パスに shipment_forecast を含めない）
beforeAll(() => {
  work = fs.mkdtempSync(path.join(os.tmpdir(), 'sfp-build-'));
});
afterAll(() => {
  fs.rmSync(work, { recursive: true, force: true });
});

function baseEnv(extra) {
  const env = { ...process.env };
  delete env.FORECAST_PREVIEW;
  delete env.FORECAST_DATA_FILE;
  return { ...env, ...extra };
}
function run(args, extraEnv) {
  const r = spawnSync(process.execPath, [ASTRO, ...args], {
    cwd: ROOT,
    env: baseEnv(extraEnv),
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return { status: r.status, output: `${r.stdout ?? ''}\n${r.stderr ?? ''}` };
}
let seq = 0;
function build(extraEnv) {
  const outDir = path.join(work, `dist${++seq}`);
  const r = run(['build', '--outDir', outDir], extraEnv);
  return { ...r, outDir };
}
const page = (outDir) => fs.readFileSync(path.join(outDir, 'cultivation', 'index.html'), 'utf8');
const writeData = (name, text) => {
  const p = path.join(work, name);
  fs.writeFileSync(p, text);
  return p;
};
function metaOf(html) {
  const tag = html.match(/<meta\b[^>]*\bname="forecast-generated-at"[^>]*>/);
  if (!tag) return null;
  const c = tag[0].match(/\bcontent="([^"]*)"/);
  return c ? c[1] : '';
}
const count = (s, needle) => s.split(needle).length - 1;

function listFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listFiles(p, out);
    else out.push(p);
  }
  return out;
}
// 出力の全ファイル（画像などの中身も）から目印を探す。ASCII の目印なので latin1 で読めば足りる
function scanDir(dir, markers) {
  const hits = [];
  for (const f of listFiles(dir)) {
    const text = fs.readFileSync(f).toString('latin1');
    const name = path.relative(dir, f);
    for (const m of markers) if (text.includes(m) || name.includes(m)) hits.push(`${m}@${name}`);
  }
  return hits;
}

// 本物の書き出しファイル（段1 の部品で、段1 のフィクスチャから作る）
function realExport(snapshot) {
  const { forecast } = buildForecast(snapshot, []);
  return { forecast, text: serializeForecast(forecast) };
}

describe('検査器そのもの（ビルドを回さずに確かめる）', () => {
  test('B-0 目印の検索は、置いた目印を見つけ、無ければ0件。載せない一覧の名前も見つける', () => {
    const d = fs.mkdtempSync(path.join(work, 'scan-'));
    fs.mkdirSync(path.join(d, '_astro'));
    fs.writeFileSync(path.join(d, '_astro', 'a.js'), 'var x="before STAGE-MARK-V1 after";');
    fs.writeFileSync(path.join(d, 'clean.html'), '<p>目印なし</p>');
    expect(scanDir(d, ['STAGE-MARK-V1', 'SRC-MARK-01'])).toEqual(['STAGE-MARK-V1@_astro\\a.js'.replace('\\', path.sep)]);
    fs.writeFileSync(path.join(d, 'shipment_forecast_hidden.json'), '[]');
    expect(listFiles(d).some((f) => f.includes('shipment_forecast_hidden'))).toBe(true);
  });

  test('B-0b 目印の一覧は十分な数の文字列を持つ（0件で緑にならない）', () => {
    const strs = Object.values(NON_PUBLIC).filter((v) => typeof v === 'string');
    expect(strs.length).toBeGreaterThanOrEqual(40);
  });

  test('B-0c meta の読み取りは、meta がある・無い・空を区別する', () => {
    expect(metaOf('<head><meta name="forecast-generated-at" content="X+09:00"></head>')).toBe('X+09:00');
    expect(metaOf('<head><meta content="Y" name="forecast-generated-at" /></head>')).toBe('Y');
    expect(metaOf('<head><meta name="description" content="Z"></head>')).toBeNull();
  });
});

describe('本物のビルド（順に1つずつ）', () => {
  test('V20 ファイル無し＋FORECAST_PREVIEW=true：成功し「出荷予報を準備しています」・meta は出さない', () => {
    const r = build({ FORECAST_PREVIEW: 'true', FORECAST_DATA_FILE: path.join(work, 'no_such_file.json') });
    expect(r.status, r.output.slice(-2000)).toBe(0);
    const html = page(r.outDir);
    expect(html).toContain('出荷予報を準備しています');
    expect(html).toContain('data-forecast-state="missing"');
    expect(metaOf(html)).toBeNull();
    expect(html).not.toContain('現在準備中です');
  });

  test('V20-2 型検査（astro check）が成功する（1回）', () => {
    const r = run(['check']);
    expect(r.status, r.output.slice(-3000)).toBe(0);
  });

  test('V21 ファイルあり（段1 の本物の書き出し）：成功。品目・品種・行が出て、meta が generated_at と完全に同じ', () => {
    const { forecast, text } = realExport(baseSnapshot());
    expect(forecast.items.length).toBeGreaterThan(3);
    const file = writeData('forecast_ok.json', text);
    const r = build({ FORECAST_PREVIEW: 'true', FORECAST_DATA_FILE: file });
    expect(r.status, r.output.slice(-2000)).toBe(0);
    const html = page(r.outDir);
    expect(html).toContain('data-forecast-state="present"');
    for (const it of forecast.items) {
      expect(html, `品目 ${it.crop}`).toContain(it.crop);
      for (const row of it.rows) if (row.variety) expect(html, `品種 ${row.variety}`).toContain(row.variety);
    }
    const totalRows = forecast.items.reduce((n, it) => n + it.rows.length, 0);
    expect(count(html, 'data-row')).toBe(totalRows);
    expect(count(html, 'この品目を問い合わせる')).toBe(
      // 区分に分かれる品目は区分の数だけ出る。最低でも品目の数
      count(html, 'data-crop'),
    );
    expect(count(html, 'data-crop')).toBeGreaterThanOrEqual(forecast.items.length);
    expect(count(html, '植えた本数の目安です。出荷できる本数や、品質をお約束する本数ではありません')).toBe(1);
    expect(metaOf(html)).toBe(forecast.generated_at);
    expect(html).toMatch(/\d{1,2}月\d{1,2}日 朝の時点/);
  });

  test('V22 0件：成功。0件の文言と meta', () => {
    const file = writeData('forecast_zero.json', serializeForecast({ generated_at: '2026-11-13T04:30:00+09:00', items: [] }));
    const r = build({ FORECAST_PREVIEW: 'true', FORECAST_DATA_FILE: file });
    expect(r.status, r.output.slice(-2000)).toBe(0);
    const html = page(r.outDir);
    expect(html).toContain('data-forecast-state="empty"');
    expect(html).toContain('いま載せられる品目はありません。出荷の見込みはお問い合わせください');
    expect(html).not.toContain('植えた本数の目安です');
    expect(metaOf(html)).toBe('2026-11-13T04:30:00+09:00');
  });

  const broken = [
    ['不正な JSON', '{ "generated_at": "2026-11-13T04:30:00+09:00", "items": ['],
    ['items が配列でない', JSON.stringify({ generated_at: '2026-11-13T04:30:00+09:00', items: {} })],
    [
      'rows が無い',
      JSON.stringify({ generated_at: '2026-11-13T04:30:00+09:00', items: [{ crop: 'ストック' }] }),
    ],
  ];
  test.each(broken)('V17 壊れたファイル（%s）：ビルドが失敗し、出力に shipment_forecast の例外文が出る', (name, text) => {
    const file = writeData(`forecast_broken_${seq}.json`, text);
    const r = build({ FORECAST_PREVIEW: 'true', FORECAST_DATA_FILE: file });
    expect(r.status, `壊れたファイルでビルドが成功してしまった: ${name}`).not.toBe(0);
    expect(r.output).toMatch(NAMED_RE);
  });

  test('V23 目印入りの写し（段1 で書き出し）：成果物の全ファイルに目印0件・ページには品目が出る・載せない一覧が出力に無い', () => {
    const { forecast, text } = realExport(allSnapshot());
    expect(forecast.items.length).toBeGreaterThan(3);
    const file = writeData('forecast_marks.json', text);
    const r = build({ FORECAST_PREVIEW: 'true', FORECAST_DATA_FILE: file });
    expect(r.status, r.output.slice(-2000)).toBe(0);
    const html = page(r.outDir);
    // 空振りにしない：同じビルドで表示部品が品目を描いている（品目名だけだとサイト共通部分の同じ文字に当たりうる）
    expect(count(html, 'data-crop')).toBeGreaterThanOrEqual(forecast.items.length);
    for (const it of forecast.items) expect(html).toContain(it.crop);
    const strMarkers = Object.values(NON_PUBLIC).filter((v) => typeof v === 'string').map(String);
    expect(scanDir(r.outDir, strMarkers)).toEqual([]);
    // 生の本数（数の目印）は、ページの HTML だけで見る（ほかのファイルは数字の偶然の一致があり得る）
    for (const n of Object.values(NON_PUBLIC).filter((v) => typeof v === 'number')) {
      expect(html.match(new RegExp(`(?<![0-9.])${n}(?![0-9])`)), `生の数 ${n}`).toBeNull();
    }
    expect(listFiles(r.outDir).filter((f) => f.includes('shipment_forecast_hidden'))).toEqual([]);
    expect(listFiles(r.outDir).filter((f) => /shipment_forecast(?!_photos)/.test(path.basename(f)))).toEqual([]);
  });

  test('V25 FORECAST_PREVIEW なし＋ファイルあり：今の「現在準備中です」のまま・品目名は出ない・meta はある', () => {
    const { forecast, text } = realExport(baseSnapshot());
    const file = writeData('forecast_nopreview.json', text);
    const r = build({ FORECAST_DATA_FILE: file });
    expect(r.status, r.output.slice(-2000)).toBe(0);
    const html = page(r.outDir);
    expect(html).toContain('Coming Soon');
    expect(html).toContain('現在準備中です');
    expect(html).not.toContain('data-forecast-state');
    // 品目名の文字そのものはサイトの共通部分（案内・フッター）にも出うるので、表示部品の目印で見る
    expect(html).not.toContain('data-crop');
    expect(html).not.toContain('data-row');
    expect(html).not.toContain('朝の時点');
    expect(forecast.items.length).toBeGreaterThan(3);
    expect(metaOf(html)).toBe(forecast.generated_at);
  });
});
