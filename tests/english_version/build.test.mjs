// 英語版 段1：本物の組み立てを1回回して、日本語ページを確かめる（T-4・T-2 日本語側・T-5 日本語側）。遅い・重い層。
//   流し方: npm run test:build（vitest の en-build 層）
// ・写し（段0）はリポジトリの外：D:\GitHub\_hp_en_baseline\ja_before（HP_EN_BASELINE で差し替え可）
//   写しと同じフォルダ（このリポジトリ）で組み立てる。部品のつなぎ番号が組み立てた場所で変わるため（あらすじ §9）
// ・出荷予報は写しと同じ固定のデータ（forecast_fixed.json）で、FORECAST_PREVIEW=true の形に固定する
// ・写しが無い・空のときは飛ばさず赤（あらすじ §3 空振り防止）
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareJa, listFiles } from './helpers/ja_compare.mjs';
import {
  PAIRS,
  SITE,
  SWITCHERS,
  OG_LOCALE_ALT_EN,
  LAYOUT_CID,
  BASELINE_PAGE_COUNT,
  BASELINE_PRODUCT_DETAIL_COUNT,
  allowedIncrementsFor,
  englishTargetOf,
  frameOf,
  isProductDetail,
  pathOf,
} from './helpers/expected.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ASTRO = path.join(ROOT, 'node_modules', 'astro', 'astro.js');
const BASE_ROOT = process.env.HP_EN_BASELINE_ROOT || path.resolve(ROOT, '..', '_hp_en_baseline');
const BASE_DIR = process.env.HP_EN_BASELINE || path.join(BASE_ROOT, 'ja_before');
const FORECAST_FIXED = path.join(BASE_ROOT, 'forecast_fixed.json');

let work;
let out;
let buildResult;
beforeAll(() => {
  work = fs.mkdtempSync(path.join(os.tmpdir(), 'hp-en-build-'));
  out = path.join(work, 'dist');
  const env = { ...process.env, FORECAST_PREVIEW: 'true', FORECAST_DATA_FILE: FORECAST_FIXED };
  delete env.MEMBERSHIP_PUBLISHED;
  // vitest が足す設定（NODE_ENV=test など）を引き継ぐと、JS の部品が本番と違う形で組み立てられる。写しを取ったときと同じ素の環境にする
  delete env.NODE_ENV;
  for (const k of Object.keys(env)) if (k.startsWith('VITEST') || k === 'TEST' || k === 'MODE' || k === 'PROD' || k === 'DEV' || k === 'SSR' || k === 'BASE_URL') delete env[k];
  const r = spawnSync(process.execPath, [ASTRO, 'build', '--outDir', out], {
    cwd: ROOT,
    env,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  buildResult = { status: r.status, output: `${r.stdout ?? ''}\n${r.stderr ?? ''}` };
});
afterAll(() => {
  if (work) fs.rmSync(work, { recursive: true, force: true });
});

const htmlPages = (dir) => listFiles(dir, { skipEn: true }).filter((r) => r.endsWith('index.html'));
const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');
const countOf = (s, t) => s.split(t).length - 1;
const relOf = (p) => (p === '/' ? 'index.html' : `${p.slice(1)}index.html`);

describe('前提：写しと組み立て', () => {
  test('B-0 写し（段0）があり、空でない：ページ60枚・商品1つずつ24件・出荷予報は固定データの中身あり', () => {
    expect(fs.existsSync(BASE_DIR), `写しが無い: ${BASE_DIR}`).toBe(true);
    expect(fs.existsSync(FORECAST_FIXED), `固定の出荷予報データが無い: ${FORECAST_FIXED}`).toBe(true);
    const pages = htmlPages(BASE_DIR);
    expect(pages.length).toBe(BASELINE_PAGE_COUNT);
    expect(pages.map(pathOf).filter(isProductDetail).length).toBe(BASELINE_PRODUCT_DETAIL_COUNT);
    expect(read(BASE_DIR, 'cultivation/index.html')).toContain('name="forecast-generated-at"');
  });

  test('B-1 いまのコードで組み立てが成功する', () => {
    expect(buildResult.status, buildResult.output.slice(-3000)).toBe(0);
  });
});

describe('T-4 日本語ページの出力が直す前と同じ（許す差だけ）', () => {
  test('T-4 全ファイルを突き合わせ、許す差の外の差が0件', () => {
    const { problems, stats } = compareJa({
      baseDir: BASE_DIR,
      curDir: out,
      layoutCid: LAYOUT_CID,
      allowedFor: (rel) => {
        const p = pathOf(rel);
        return p ? allowedIncrementsFor(p) : [];
      },
    });
    expect(stats.htmlCompared).toBe(BASELINE_PAGE_COUNT); // 比べたページが0件・欠けで緑にしない
    expect(problems, problems.slice(0, 15).join('\n')).toEqual([]);
  });
});

describe('T-2 hreflang（日本語側）', () => {
  test.each(PAIRS)('T-2 ペアあり %s：ja／en／x-default の3本ちょうど・絶対URL・末尾 / あり', (ja, en) => {
    const html = read(out, relOf(ja));
    const head = html.slice(0, html.indexOf('</head>'));
    const links = head.match(/<link rel="alternate" hreflang="[^"]*" href="[^"]*">/g) ?? [];
    expect(links).toEqual([
      `<link rel="alternate" hreflang="ja" href="${SITE}${ja}">`,
      `<link rel="alternate" hreflang="en" href="${SITE}${en}">`,
      `<link rel="alternate" hreflang="x-default" href="${SITE}${ja}">`,
    ]);
    expect(countOf(head, OG_LOCALE_ALT_EN)).toBe(1);
  });

  test('T-2 ペア無しの日本語ページ（商品1つずつ・Works・出荷予報ほか）には hreflang も og:locale:alternate も出ない', () => {
    const pairJa = new Set(PAIRS.map(([ja]) => ja));
    const others = htmlPages(out).map(pathOf).filter((p) => p && !pairJa.has(p));
    expect(others.length).toBe(BASELINE_PAGE_COUNT - PAIRS.length);
    const bad = others.filter((p) => {
      const html = read(out, relOf(p));
      return /hreflang="(ja|en|x-default)"[^>]*href=/.test(html.slice(0, html.indexOf('</head>'))) || html.includes('og:locale:alternate');
    });
    expect(bad).toEqual([]);
  });
});

describe('T-5 切り替えの行き先（日本語側）', () => {
  const cases = [
    ['/about/', '/en/about/'],
    ['/products/bouquet/', '/en/products/bouquet/'],
    ['/', '/en/'],
    ['/works/', '/en/'],
    ['/cultivation/', '/en/'],
    ['/privacy/', '/en/'],
    ['/products/bouquet/01_table-flower/', '/en/products/'],
    ['/products/imperfect/07_202607-spray-mum/', '/en/products/'],
  ];
  test.each(cases)('T-5 %s の「English」は %s へ（パソコン・スマホとも）', (p, target) => {
    expect(englishTargetOf(p)).toBe(target); // 手書きの規則と表が食い違っていないか
    const html = read(out, relOf(p));
    const kinds = frameOf(p) === 'works' ? ['works-desktop', 'works-mobile'] : ['desktop', 'mobile'];
    for (const k of kinds) expect(countOf(html, SWITCHERS[k](target)), k).toBe(1);
    // 押せない「日本語」と、英語の印の付いたリンク
    expect(html).toContain('<span aria-current="true">日本語</span>');
    expect(html).toContain(`<a href="${target}" hreflang="en" lang="en"`);
  });

  test('T-5 パソコンの切り替えはヘッダーの中、スマホの切り替えはスマホのメニューの中にある', () => {
    const html = read(out, 'about/index.html');
    const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
    expect(header).toContain('data-lang-switch="desktop"');
    const mobile = html.slice(html.indexOf('id="mobile-menu"'), html.indexOf('<main'));
    expect(mobile).toContain('data-lang-switch="mobile"');
  });

  test('T-5 Works の見本サイト（mock）には切り替えを出さない', () => {
    const mocks = htmlPages(out).filter((r) => r.startsWith('works/mock/'));
    expect(mocks.length).toBeGreaterThan(0);
    expect(mocks.filter((r) => read(out, r).includes('data-lang-switch'))).toEqual([]);
  });
});
