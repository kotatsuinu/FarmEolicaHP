// T-4：日本語ページの組み立て結果を、段0の写し（直す前）と突き合わせる。
// 許す差は、あらすじ §9 で実測して名指しした形だけ（許1〜許5）。広い正規化はしない。
// 実装のコードは読み込まない（期待値・比較の作法はテスト側だけで持つ）。
import fs from 'node:fs';
import path from 'node:path';

// 組み立て先をプロジェクトの外にしたときだけ出る途中の部品（本番の dist には無い・段0の実測）
const INTERMEDIATE_TOP = new Set(['content-assets.mjs', 'content-modules.mjs', 'data-store.json', 'settings.json']);
const isIntermediate = (rel) => INTERMEDIATE_TOP.has(rel) || /^collections\/[^/]+\.schema\.json$/.test(rel);

export function listFiles(root, { skipEn = false } = {}) {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else out.push(path.relative(root, full).split(path.sep).join('/'));
    }
  };
  walk(root);
  return out.filter((r) => !isIntermediate(r) && !(skipEn && (r === 'en' || r.startsWith('en/')))).sort();
}

// 許4：CSS を「規則のかたまり」に切る（@… の開き・selector{…}・閉じ括弧）
function cssTokens(css) {
  return css.match(/@[^{};]+\{|[^{}]+\{[^{}]*\}|\}|[^{}]+$/g) ?? [];
}
// 古い CSS のかたまりが、新しい CSS の中に同じ順で全部残っている（足されただけ）か
export function cssOnlyAdded(oldCss, newCss) {
  const a = cssTokens(oldCss);
  const b = cssTokens(newCss);
  if (a.join('') !== oldCss || b.join('') !== newCss) return false; // 切り方で取りこぼしたら説明できない側に倒す
  let j = 0;
  for (const t of a) {
    while (j < b.length && b[j] !== t) j++;
    if (j === b.length) return false;
    j++;
  }
  return true;
}

// 許5：<style> の中で枠の塊だけが位置を変えたなら、写しの側の並びに戻す
function normalizeLayoutChunkMove(baseHtml, curHtml, layoutCid) {
  const re = /<style>([\s\S]*?)<\/style>/g;
  const bs = [...baseHtml.matchAll(re)].map((m) => m[1]);
  const cs = [...curHtml.matchAll(re)].map((m) => m[1]);
  if (bs.length !== cs.length) return { html: curHtml, moved: 0 };
  let i = 0;
  let moved = 0;
  const html = curHtml.replace(re, (whole, body) => {
    const b = bs[i++];
    if (body === b) return whole;
    const bc = b.split('\n');
    const cc = body.split('\n');
    const bl = bc.filter((c) => c.includes(layoutCid));
    const cl = cc.filter((c) => c.includes(layoutCid));
    if (bl.length !== 1 || cl.length !== 1 || bl[0] !== cl[0]) return whole;
    const rest = (arr) => arr.filter((c) => !c.includes(layoutCid)).join('\n');
    if (rest(bc) !== rest(cc)) return whole;
    moved++;
    return `<style>${b}</style>`;
  });
  return { html, moved };
}

function firstDiff(a, b) {
  let k = 0;
  while (k < a.length && k < b.length && a[k] === b[k]) k++;
  return { at: k, base: a.slice(Math.max(0, k - 60), k + 120), cur: b.slice(Math.max(0, k - 60), k + 120) };
}

const count = (s, t) => (t === '' ? 0 : s.split(t).length - 1);

/**
 * @param {object} o
 * @param {string} o.baseDir 段0の写し
 * @param {string} o.curDir いまの組み立て結果
 * @param {(relHtmlPath:string)=>{name:string,text:string,count:number}[]} o.allowedFor 1ページに許す増分
 * @param {(relPath:string)=>{name:string,text:string,count:number}[]} [o.allowedForFile] HTML 以外のファイルに許す増分（許6。既定は無し＝中身まで同じ）
 * @param {string} o.layoutCid 枠の印
 * @returns {{problems:string[], stats:object}}
 */
export function compareJa({ baseDir, curDir, allowedFor, allowedForFile = () => [], layoutCid }) {
  const problems = [];
  const base = listFiles(baseDir);
  const cur = listFiles(curDir, { skipEn: true });
  const baseSet = new Set(base);
  const curSet = new Set(cur);
  const onlyBase = base.filter((r) => !curSet.has(r));
  const onlyCur = cur.filter((r) => !baseSet.has(r));

  // 許4：共通の CSS の名前替え（_astro/<名前>.<印>.css が1対1で替わったもの）
  const renames = new Map(); // 古い名前 → 新しい名前
  const cssKey = (r) => (/^_astro\/([^.]+)\.[^.]+\.css$/.exec(r) ?? [])[1];
  for (const o of onlyBase.filter((r) => cssKey(r))) {
    const cands = onlyCur.filter((r) => cssKey(r) === cssKey(o));
    const olds = onlyBase.filter((r) => cssKey(r) === cssKey(o));
    if (cands.length === 1 && olds.length === 1) {
      const oldCss = fs.readFileSync(path.join(baseDir, o), 'utf8');
      const newCss = fs.readFileSync(path.join(curDir, cands[0]), 'utf8');
      if (cssOnlyAdded(oldCss, newCss)) renames.set(o, cands[0]);
      else problems.push(`CSS の中身が「足しただけ」でない: ${o} → ${cands[0]}`);
    }
  }
  const renamedNew = new Set(renames.values());
  for (const r of onlyBase) if (!renames.has(r)) problems.push(`写しにあるのに無いファイル: ${r}`);
  // 許7（段2）：英語ページだけが読む部品（_astro/ の下に増えたファイル）。
  //   写しにあったファイルは中身まで、日本語ページの HTML は1文字まで突き合わせるので、日本語側から新しいファイルは読めない。
  //   _astro/ の外に増えたファイル（新しいページなど）は今までどおり赤
  let enOnlyAssets = 0;
  for (const r of onlyCur) {
    if (renamedNew.has(r)) continue;
    if (r.startsWith('_astro/')) enOnlyAssets++;
    else problems.push(`写しに無いファイルが増えた: ${r}`);
  }

  let htmlCompared = 0;
  let chunkMoves = 0;
  for (const r of base) {
    if (!curSet.has(r)) continue;
    const bBuf = fs.readFileSync(path.join(baseDir, r));
    const cBuf = fs.readFileSync(path.join(curDir, r));
    if (!r.endsWith('.html')) {
      // 許6（段2）：サイトマップのように、HTML でなくても許す増分を名指ししたファイルは、増分をちょうどの個数だけ外して比べる
      const incs = allowedForFile(r);
      if (incs.length === 0) {
        if (!bBuf.equals(cBuf)) problems.push(`中身が変わった: ${r}`);
        continue;
      }
      let c = cBuf.toString('utf8');
      let ok = true;
      for (const inc of incs) {
        const n = count(c, inc.text);
        if (n !== inc.count) {
          problems.push(`${r}: 許す差「${inc.name}」が ${inc.count} 個のはずが ${n} 個（${inc.text}）`);
          ok = false;
          continue;
        }
        c = c.split(inc.text).join('');
      }
      if (ok && c !== bBuf.toString('utf8')) {
        const d = firstDiff(bBuf.toString('utf8'), c);
        problems.push(`${r}: 許す差の外で変わった（${d.at}文字目）\n  写し: ${JSON.stringify(d.base)}\n  いま: ${JSON.stringify(d.cur)}`);
      }
      continue;
    }
    htmlCompared++;
    const b = bBuf.toString('utf8');
    let c = cBuf.toString('utf8');
    for (const inc of allowedFor(r)) {
      const n = count(c, inc.text);
      if (n !== inc.count) {
        problems.push(`${r}: 許す差「${inc.name}」が ${inc.count} 個のはずが ${n} 個`);
        continue;
      }
      c = c.split(inc.text).join('');
    }
    for (const [o, n] of renames) {
      // 古い名前を読んでいた所は、同じ数だけ新しい名前に替わっている（消えたファイルを読み続けていない）
      const before = count(b, `/${o}"`);
      if (count(c, `/${o}"`) !== 0 || count(c, `/${n}"`) !== before) {
        problems.push(`${r}: CSS の読み込み行が名前替え（${o} → ${n}）に合っていない`);
      }
      c = c.split(`/${n}"`).join(`/${o}"`);
    }
    const norm = normalizeLayoutChunkMove(b, c, layoutCid);
    c = norm.html;
    chunkMoves += norm.moved;
    if (c !== b) {
      const d = firstDiff(b, c);
      problems.push(`${r}: 許す差の外で変わった（${d.at}文字目）\n  写し: ${JSON.stringify(d.base)}\n  いま: ${JSON.stringify(d.cur)}`);
    }
  }
  return { problems, stats: { base: base.length, cur: cur.length, htmlCompared, renames: renames.size, chunkMoves, enOnlyAssets } };
}
