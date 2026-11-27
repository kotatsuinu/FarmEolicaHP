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
  EN_PAGES,
  EN_MUST_NOT_EXIST,
  SWITCHERS_EN,
  JAPANESE_MARK,
  DOMESTIC_ONLY,
  DOMESTIC_ONLY_PAGES,
  OVERSEAS_PROMISE,
  EN_MIN_LETTERS_IN_MAIN,
  japaneseOfEn,
  sitemapEnEntries,
} from './helpers/expected.mjs';
import { JA_ALLOWED_WORDS, JA_ALLOWED_MAX } from './helpers/ja_allowlist.mjs';
import { japaneseFindings, readableText, mainText, anchorsOf, internalPathOf, resolveInDist } from './helpers/en_checks.mjs';

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
      // 許6（段2）：英語ページ12枚の分だけサイトマップに行が足される。段3で T-9 の形に置き換える
      allowedForFile: (rel) => (rel === 'sitemap-0.xml' ? sitemapEnEntries() : []),
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

// ───────────── 段2：英語ページ12枚（あらすじ T-1・T-2 英語側・T-3・T-5 英語側・T-11） ─────────────

const enHtml = (p) => read(out, relOf(p));

describe('T-1 英語ページ12枚が組み立てられる（段2）', () => {
  test('T-1 dist/en/ のページは仕様書 §2 の12枚ちょうど（欠けも余りも無い）', () => {
    const got = listFiles(out)
      .filter((r) => r.startsWith('en/') && r.endsWith('index.html'))
      .map(pathOf)
      .sort();
    expect(got).toEqual([...EN_PAGES].sort());
  });

  test('T-1 商品1つずつの英語ページは作られない（仕様書 §9 ①）', () => {
    for (const p of EN_MUST_NOT_EXIST) expect(fs.existsSync(path.join(out, relOf(p))), p).toBe(false);
  });

  test.each(EN_PAGES)('T-1 %s：<html lang="en">・h1 がちょうど1つ・本文に英字が一定数', (p) => {
    const html = enHtml(p);
    expect(html).toMatch(/<html lang="en"[\s>]/);
    expect(countOf(html, '<h1')).toBe(1);
    const letters = (mainText(html).match(/[A-Za-z]/g) ?? []).length;
    expect(letters).toBeGreaterThanOrEqual(EN_MIN_LETTERS_IN_MAIN);
  });
});

describe('T-2 hreflang（英語側・段2）', () => {
  test.each(PAIRS.map(([ja, en]) => [en, ja]))('T-2 %s：ja／en／x-default の3本ちょうど・canonical は自分・og:locale は en_US', (en, ja) => {
    const html = enHtml(en);
    const head = html.slice(0, html.indexOf('</head>'));
    const links = head.match(/<link rel="alternate" hreflang="[^"]*" href="[^"]*">/g) ?? [];
    expect(links).toEqual([
      `<link rel="alternate" hreflang="ja" href="${SITE}${ja}">`,
      `<link rel="alternate" hreflang="en" href="${SITE}${en}">`,
      `<link rel="alternate" hreflang="x-default" href="${SITE}${ja}">`,
    ]);
    expect(head).toContain(`<link rel="canonical" href="${SITE}${en}">`);
    expect(countOf(head, '<meta property="og:locale" content="en_US">')).toBe(1);
    expect(countOf(head, '<meta property="og:locale" content="ja_JP">')).toBe(0);
    expect(countOf(head, '<meta property="og:locale:alternate" content="ja_JP">')).toBe(1);
  });
});

describe('T-3 英語ページに日本語が混じらない（段2）', () => {
  test('T-3 許可リストは手書き・1語ずつ理由と場所つき・上限の目安以内（超えたら園主に見せる）', () => {
    expect(JA_ALLOWED_WORDS.length).toBeLessThanOrEqual(JA_ALLOWED_MAX);
    for (const a of JA_ALLOWED_WORDS) {
      expect(a.why?.length ?? 0, a.word).toBeGreaterThan(0);
      expect(['page', 'ld+json']).toContain(a.where);
      expect(a.word).toMatch(/[ぁ-ヿ一-鿿]/);
      expect(a.word).not.toBe('日本語'); // 切り替えのラベルは、切り替えの要素の中だけ道具の側で許す
    }
  });

  test.each(EN_PAGES)('T-3 %s：許可した固有名詞のほかに日本語の文字が0件', (p) => {
    const found = japaneseFindings(enHtml(p), JA_ALLOWED_WORDS);
    expect(found.map((f) => `[${f.where}]「${f.text}」…${f.context}…`)).toEqual([]);
  });

  describe('T-3 陽性の確かめ：英語ページの写しに日本語を混ぜると、混ぜた語がその場所で見つかる（検査の空振り防止）', () => {
    let html;
    beforeAll(() => {
      html = enHtml('/en/about/');
    });
    const found = (h) => japaneseFindings(h, JA_ALLOWED_WORDS);
    const W = '農園';
    // [名前, 混ぜ方, 見つかるはずの語, 場所]
    const hits = [
      ['本文', (h) => h.replace('</main>', `<p>${W}</p></main>`), W, 'page'],
      ['画像の alt', (h) => h.replace('</main>', `<img alt="${W}" src="/x.jpg"></main>`), W, 'page'],
      ['ボタンの読み上げ文（aria-label）', (h) => h.replace('</main>', `<button aria-label="${W}"></button></main>`), W, 'page'],
      ['入力欄の placeholder', (h) => h.replace('</main>', `<input placeholder="${W}"></main>`), W, 'page'],
      ['<title>', (h) => h.replace('<title>', `<title>${W} `), W, 'page'],
      ['検索結果の説明（meta description）', (h) => h.replace('<meta name="description" content="', `<meta name="description" content="${W} `), W, 'page'],
      ['構造化データ', (h) => h.replace('</head>', `<script type="application/ld+json">{"name":"${W}"}</script></head>`), W, 'ld+json'],
      ['切り替えの外の「日本語」', (h) => h.replace('</main>', '<p>日本語</p></main>'), '日本語', 'page'],
      ['長音だけ', (h) => h.replace('</main>', '<p>Flower ー</p></main>'), 'ー', 'page'],
      ['全角の句点', (h) => h.replace('</main>', '<p>Thanks。</p></main>'), '。', 'page'],
      ['全角の円記号', (h) => h.replace('</main>', '<p>￥1,300</p></main>'), '￥', 'page'],
      ['米印', (h) => h.replace('</main>', '<p>※ Note</p></main>'), '※', 'page'],
      ['許可した屋号を許可の場所の外（本文）に出す', (h) => h.replace('</main>', '<p>ファームエオリカ</p></main>'), 'ファームエオリカ', 'page'],
    ];
    test.each(hits)('T-3 %s に混ぜると見つかる', (_, inject, word, where) => {
      const before = found(html).filter((f) => f.text === word && f.where === where).length;
      const after = found(inject(html)).filter((f) => f.text === word && f.where === where).length;
      expect(after).toBe(before + 1);
    });
    // 見ない範囲（§4.2：HTML コメントと JS の本体）と、数えない文字（¥ U+00A5・英語の記号）
    const misses = [
      ['HTML コメント', (h) => h.replace('</main>', `<!-- ${W} --></main>`)],
      ['構造化データ以外の <script>', (h) => h.replace('</main>', `<script>const a = "${W}";</script></main>`)],
      ['値段の ¥（U+00A5）と英語の記号', (h) => h.replace('</main>', '<p>¥1,300 — “Loss Flower” … © →</p></main>')],
    ];
    test.each(misses)('T-3 %s は数えない', (_, inject) => {
      expect(found(inject(html)).length).toBe(found(html).length);
    });
  });
});

// 英語ページの中のリンクの問題（/en/ の下でも「(Japanese)」付きでもない日本語のページへのリンク・行き先が無いリンク）
function linkProblems(html, pagePath) {
  const bad = [];
  let internal = 0;
  for (const a of anchorsOf(html)) {
    const p = internalPathOf(a.href, pagePath);
    if (p == null) continue;
    internal++;
    const hit = resolveInDist(out, p);
    if (!hit) {
      bad.push(`行き先が無い: ${a.href}（${a.text}）`);
      continue;
    }
    const underEn = p === '/en' || p.startsWith('/en/');
    if (hit.kind === 'page' && !underEn && !a.text.includes(JAPANESE_MARK)) bad.push(`日本語のページへ印なし: ${a.href}（${a.text}）`);
  }
  return { bad, internal };
}

describe('T-5 英語ページの切り替えとリンク（段2）', () => {
  test.each(EN_PAGES)('T-5 %s の「日本語」は日本語の相手へ（パソコン・スマホとも）。「English」は押せない', (en) => {
    const html = enHtml(en);
    const ja = japaneseOfEn(en);
    for (const k of ['desktop', 'mobile']) expect(countOf(html, SWITCHERS_EN[k](ja)), k).toBe(1);
    expect(countOf(html, 'data-lang-switch=')).toBe(2);
    expect(resolveInDist(out, ja)?.kind).toBe('page');
  });

  test.each(EN_PAGES)('T-5 %s の中のリンクは /en/ の下か「(Japanese)」付きで、行き先が組み立て結果に在る', (en) => {
    const { bad, internal } = linkProblems(enHtml(en), en);
    expect(internal).toBeGreaterThan(0); // リンクを1本も拾えないまま緑にしない
    expect(bad).toEqual([]);
  });

  test('T-5 陽性の確かめ：印なしの日本語ページへのリンク・無い行き先を拾い、印つき・/en/ の下・外のサイトは拾わない', () => {
    const html = enHtml('/en/about/');
    const base = linkProblems(html, '/en/about/').bad.length;
    const add = (s) => linkProblems(html.replace('</main>', `${s}</main>`), '/en/about/').bad;
    expect(add('<a href="/about/">About the farm</a>').length).toBe(base + 1);
    expect(add('<a href="/about/">About the farm</a>').at(-1)).toContain('日本語のページへ印なし: /about/');
    expect(add('<a href="https://farmeolica.com/privacy/">Privacy</a>').at(-1)).toContain('日本語のページへ印なし');
    expect(add('<a href="/en/no-such-page/">x</a>').at(-1)).toContain('行き先が無い: /en/no-such-page/');
    expect(add(`<a href="/privacy/">Privacy Policy ${JAPANESE_MARK}</a>`).length).toBe(base);
    expect(add('<a href="/en/faq/">FAQ</a>').length).toBe(base);
    expect(add('<a href="https://www.instagram.com/farm_eolica/">Instagram</a>').length).toBe(base);
  });
});

describe('T-11 「お届けは日本国内のみ」（段2）', () => {
  test.each(DOMESTIC_ONLY_PAGES)('T-11 %s に国内のみの文がある', (p) => {
    expect(readableText(enHtml(p)).body).toContain(DOMESTIC_ONLY);
  });

  test.each(EN_PAGES)('T-11 %s に海外発送を約束するように読める語が無い', (p) => {
    const { body, attrs, ld } = readableText(enHtml(p));
    const re = new RegExp(OVERSEAS_PROMISE.source, 'gi');
    const hits = [body, ...attrs, ...ld].flatMap((t) => [...t.matchAll(re)].map((m) => m[0]));
    expect(hits).toEqual([]);
  });

  test('T-11 陽性の確かめ：海外発送の語を拾い、国内のみの文は拾わない', () => {
    for (const s of ['We ship worldwide.', 'International shipping is available.', 'We can ship overseas.', 'Orders from abroad are welcome.', 'We deliver globally.']) {
      expect(OVERSEAS_PROMISE.test(s), s).toBe(true);
    }
    expect(OVERSEAS_PROMISE.test(DOMESTIC_ONLY)).toBe(false);
  });
});
