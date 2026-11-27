// T-4 の突き合わせの道具そのものを確かめる（速い・組み立てなし）。
// 許す差が広すぎて退行を飲み込まないか（あらすじ §3「許す差の除去は完全一致・個数を決めて」）を、手で作った小さな写しで見る。
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { compareJa, cssOnlyAdded } from './helpers/ja_compare.mjs';

const CID = 'data-astro-cid-sckkx6r4';
const STYLE = `<style>.a[data-astro-cid-aaaa]{color:red}\n[${CID}][data-animate]{opacity:0}\n.b[data-astro-cid-bbbb]{color:blue}</style>`;
const PAGE = `<!DOCTYPE html><html lang="ja" ${CID}> <head><link rel="stylesheet" href="/_astro/about.AAAA.css">${STYLE}<link rel="canonical" href="https://farmeolica.com/about/"></head> <body ${CID}> <ul ${CID}> <li ${CID}>FAQ</li> </ul> </body></html>`;
const CSS = '.a{color:red}@media (min-width:768px){.md\\:flex{display:flex}}.z{top:0}';
const INC = ' <li data-lang-switch="desktop">X</li>';

let tmp;
let base;
let cur;
const write = (root, rel, text) => {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
};
beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hp-en-cmp-'));
  base = path.join(tmp, 'base');
  cur = path.join(tmp, 'cur');
  for (const root of [base, cur]) {
    write(root, 'about/index.html', PAGE);
    write(root, '_astro/about.AAAA.css', CSS);
    write(root, 'logo.svg', '<svg/>');
  }
});
afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

const run = (allowed = []) => compareJa({ baseDir: base, curDir: cur, layoutCid: CID, allowedFor: () => allowed });
const withInc = (html) => html.replace(`</li> </ul>`, `</li>${INC} </ul>`);

describe('突き合わせの道具（T-4 の検出力）', () => {
  test('C-1 同じなら差0件', () => {
    expect(run().problems).toEqual([]);
  });

  test('C-2 メニューの文字を1文字変えると赤（M5 の形）', () => {
    write(cur, 'about/index.html', PAGE.replace('FAQ', 'FAQ!'));
    const { problems } = run();
    expect(problems.length).toBe(1);
    expect(problems[0]).toContain('許す差の外で変わった');
  });

  test('C-3 許す差の形の外の属性を1つ足すと赤（M10 の形）', () => {
    write(cur, 'about/index.html', PAGE.replace(`<ul ${CID}>`, `<ul ${CID} data-x="1">`));
    expect(run().problems[0]).toContain('許す差の外で変わった');
  });

  test('C-4 許す増分はちょうどの個数だけ消せる（0個・2個は赤）', () => {
    const allowed = [{ name: '切り替え', text: INC, count: 1 }];
    write(cur, 'about/index.html', withInc(PAGE));
    expect(run(allowed).problems).toEqual([]);
    write(cur, 'about/index.html', withInc(withInc(PAGE)));
    expect(run(allowed).problems[0]).toContain('1 個のはずが 2 個');
    write(cur, 'about/index.html', PAGE);
    expect(run(allowed).problems[0]).toContain('1 個のはずが 0 個');
  });

  test('C-5 許す増分の前の空白が違うと赤（空白をゆるめていない）', () => {
    const allowed = [{ name: '切り替え', text: INC, count: 1 }];
    write(cur, 'about/index.html', PAGE.replace(`</li> </ul>`, `</li>${INC}  </ul>`));
    expect(run(allowed).problems[0]).toContain('許す差の外で変わった');
  });

  test('C-6 共通の CSS が「足されただけ」で名前が替わったときは緑（許4）', () => {
    fs.rmSync(path.join(cur, '_astro/about.AAAA.css'));
    write(cur, '_astro/about.BBBB.css', '.a{color:red}@media (min-width:768px){.md\\:aaa{gap:0}.md\\:flex{display:flex}}.y{left:0}.z{top:0}');
    write(cur, 'about/index.html', PAGE.replace('about.AAAA.css', 'about.BBBB.css'));
    const r = run();
    expect(r.problems).toEqual([]);
    expect(r.stats.renames).toBe(1);
  });

  test('C-7 共通の CSS の規則が1つでも書き換わったら赤（許4 の外）', () => {
    fs.rmSync(path.join(cur, '_astro/about.AAAA.css'));
    write(cur, '_astro/about.BBBB.css', '.a{color:green}@media (min-width:768px){.md\\:flex{display:flex}}.z{top:0}');
    write(cur, 'about/index.html', PAGE.replace('about.AAAA.css', 'about.BBBB.css'));
    expect(run().problems.join('\n')).toContain('足しただけ」でない');
  });

  test('C-8 CSS の名前だけ替わって中身が同じでも、ページの読み込み行が古い名前のままなら赤', () => {
    fs.rmSync(path.join(cur, '_astro/about.AAAA.css'));
    write(cur, '_astro/about.BBBB.css', CSS);
    expect(run().problems[0]).toContain('CSS の読み込み行が名前替え');
  });

  test('C-9 <style> の中で枠の塊だけが動いたのは緑（許5）', () => {
    const moved = `<style>[${CID}][data-animate]{opacity:0}\n.a[data-astro-cid-aaaa]{color:red}\n.b[data-astro-cid-bbbb]{color:blue}</style>`;
    write(cur, 'about/index.html', PAGE.replace(STYLE, moved));
    const r = run();
    expect(r.problems).toEqual([]);
    expect(r.stats.chunkMoves).toBe(1);
  });

  test('C-10 枠以外の塊が動いたら赤（許5 の外）', () => {
    const moved = `<style>.b[data-astro-cid-bbbb]{color:blue}\n[${CID}][data-animate]{opacity:0}\n.a[data-astro-cid-aaaa]{color:red}</style>`;
    write(cur, 'about/index.html', PAGE.replace(STYLE, moved));
    expect(run().problems[0]).toContain('許す差の外で変わった');
  });

  test('C-11 枠の塊の中身が変わったら赤（動いただけでない）', () => {
    write(cur, 'about/index.html', PAGE.replace(`[${CID}][data-animate]{opacity:0}`, `[${CID}][data-animate]{opacity:1}`));
    expect(run().problems[0]).toContain('許す差の外で変わった');
  });

  test('C-12 途中の部品5つと /en/ の下は数えない。それ以外の新しいファイル・消えたファイル・中身の変わった画像は赤', () => {
    for (const f of ['content-assets.mjs', 'content-modules.mjs', 'data-store.json', 'settings.json', 'collections/products.schema.json', 'en/index.html']) {
      write(cur, f, 'x');
    }
    expect(run().problems).toEqual([]);
    write(cur, 'robots.txt', 'x');
    expect(run().problems.join('\n')).toContain('写しに無いファイルが増えた: robots.txt');
    fs.rmSync(path.join(cur, 'robots.txt'));
    write(cur, 'logo.svg', '<svg />');
    expect(run().problems).toEqual(['中身が変わった: logo.svg']);
    fs.rmSync(path.join(cur, 'logo.svg'));
    expect(run().problems).toEqual(['写しにあるのに無いファイル: logo.svg']);
  });

  test('C-14 許7：_astro/ の下に増えたファイル（英語ページだけが読む部品）は数えない。_astro/ の外に増えたページは赤', () => {
    write(cur, '_astro/en-only.XXXX.js', 'x');
    write(cur, '_astro/hero.YYYY_Z1abc.webp', 'x');
    const r = run();
    expect(r.problems).toEqual([]);
    expect(r.stats.enOnlyAssets).toBe(2);
    write(cur, 'products/new-page/index.html', 'x');
    expect(run().problems).toEqual(['写しに無いファイルが増えた: products/new-page/index.html']);
  });

  test('C-15 許7 があっても、写しにあった _astro/ のファイルの中身が変われば赤', () => {
    write(cur, '_astro/en-only.XXXX.js', 'x');
    write(cur, '_astro/about.AAAA.css', `${CSS}.q{x:1}`);
    expect(run().problems).toEqual(['中身が変わった: _astro/about.AAAA.css']);
  });

  describe('C-16 許6：サイトマップの英語の行（ちょうどの個数だけ外して、残りは1文字まで同じ）', () => {
    const SM = '<urlset><url><loc>https://farmeolica.com/</loc></url><url><loc>https://farmeolica.com/about/</loc></url></urlset>';
    const EN1 = '<url><loc>https://farmeolica.com/en/</loc></url>';
    const EN2 = '<url><loc>https://farmeolica.com/en/about/</loc></url>';
    const incs = [
      { name: 'サイトマップの英語の行', text: EN1, count: 1 },
      { name: 'サイトマップの英語の行', text: EN2, count: 1 },
    ];
    const runSm = () =>
      compareJa({ baseDir: base, curDir: cur, layoutCid: CID, allowedFor: () => [], allowedForFile: (r) => (r === 'sitemap-0.xml' ? incs : []) });
    beforeEach(() => write(base, 'sitemap-0.xml', SM));

    test('英語の行がちょうど1本ずつ足されただけなら緑', () => {
      write(cur, 'sitemap-0.xml', SM.replace('</urlset>', `${EN1}${EN2}</urlset>`));
      expect(runSm().problems).toEqual([]);
    });
    test('英語の行が足りない・2本ある・日本語の行が消えた・英語でない行が増えたは赤', () => {
      write(cur, 'sitemap-0.xml', SM.replace('</urlset>', `${EN1}</urlset>`));
      expect(runSm().problems.join('\n')).toContain('1 個のはずが 0 個');
      write(cur, 'sitemap-0.xml', SM.replace('</urlset>', `${EN1}${EN2}${EN2}</urlset>`));
      expect(runSm().problems.join('\n')).toContain('1 個のはずが 2 個');
      write(cur, 'sitemap-0.xml', `${SM.replace('<url><loc>https://farmeolica.com/about/</loc></url>', '')}`.replace('</urlset>', `${EN1}${EN2}</urlset>`));
      expect(runSm().problems.join('\n')).toContain('許す差の外で変わった');
      write(cur, 'sitemap-0.xml', SM.replace('</urlset>', `${EN1}${EN2}<url><loc>https://farmeolica.com/x/</loc></url></urlset>`));
      expect(runSm().problems.join('\n')).toContain('許す差の外で変わった');
    });
    test('許す増分を名指ししていないファイルは今までどおり中身まで同じでないと赤', () => {
      write(cur, 'sitemap-0.xml', SM.replace('</urlset>', `${EN1}${EN2}</urlset>`));
      expect(run().problems).toEqual(['中身が変わった: sitemap-0.xml']);
    });
  });

  test('C-13 cssOnlyAdded：同じ・足しただけは true、消えた・入れ替わったは false', () => {
    expect(cssOnlyAdded(CSS, CSS)).toBe(true);
    expect(cssOnlyAdded(CSS, `${CSS}.q{x:1}`)).toBe(true);
    expect(cssOnlyAdded(CSS, '.a{color:red}.z{top:0}')).toBe(false);
    expect(cssOnlyAdded('.a{x:1}.b{y:2}', '.b{y:2}.a{x:1}')).toBe(false);
  });
});
