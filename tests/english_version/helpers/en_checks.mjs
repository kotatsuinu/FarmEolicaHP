// 英語ページを確かめる道具（テスト側だけで持つ。実装のコードは読み込まない）。
// 出所：テストのあらすじ T-3（§4.1 数える文字・§4.2 見る範囲）・T-5（英語ページ内のリンク）・T-11
import fs from 'node:fs';
import path from 'node:path';

// §4.1 日本語として数える文字。
//  ひらがな・カタカナ（長音「ー」・中点「・」を含む）・カタカナ拡張・漢字（拡張A・互換を含む）・
//  全角の句読点やかぎ括弧（、。「」〜 全角スペース【】）・全角の英数字と記号（！～（）／｜）・半角カナ・全角の￥など・米印「※」。
//  ¥（U+00A5）と英語の通常の記号（— – … “ ” ’ © →）は数えない
const JA_CHAR = /[　-〿぀-ゟ゠-ヿㇰ-ㇿ㐀-䶿一-鿿豈-﫿！-ﾟ￠-￮※]/;
const JA_RUN = new RegExp(`${JA_CHAR.source}+`, 'g');

const stripComments = (html) => html.replace(/<!--[\s\S]*?-->/g, '');
const LD_RE = /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;

/**
 * ページを §4.2 の範囲に切り分ける。
 *  page：HTML コメント・<script>（構造化データ以外）・<style> を除いた残り全部（本文・属性・<title>・meta を含む）
 *  ld  ：<script type="application/ld+json"> の中身
 * 切り替えの要素（<li data-lang-switch>）の中の「日本語」1つだけは page から外す
 */
export function scopesOf(html) {
  const ld = [];
  let page = stripComments(html).replace(LD_RE, (_, body) => {
    ld.push(body);
    return '';
  });
  page = page.replace(/<script\b[\s\S]*?<\/script>/g, '').replace(/<style\b[\s\S]*?<\/style>/g, '');
  page = page.replace(/<li data-lang-switch="[^"]*"[^>]*>[\s\S]*?<\/li>/g, (li) => li.replace('>日本語</a>', '></a>'));
  return { page, ld };
}

/** 日本語の文字のかたまりを、前後の文脈つきで返す（許可リストの語は、その場所に限って先に外す） */
export function japaneseFindings(html, allowed = []) {
  const { page, ld } = scopesOf(html);
  const out = [];
  const scan = (text, where) => {
    let t = text;
    for (const a of allowed) if (a.where === where || a.where === 'page') t = t.split(a.word).join('');
    for (const m of t.matchAll(JA_RUN)) {
      const ctx = t.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40).replace(/\s+/g, ' ');
      out.push({ where, text: m[0], context: ctx });
    }
  };
  scan(page, 'page');
  for (const body of ld) scan(body, 'ld+json');
  return out;
}

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');

/** 人の目に入る文（タグを外した本文）と、alt・title・aria-label・placeholder・meta の content */
export function readableText(html) {
  const { page, ld } = scopesOf(html);
  const body = decode(page.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  const attrs = [...page.matchAll(/\s(?:alt|title|aria-label|placeholder|content)="([^"]*)"/g)].map((m) => decode(m[1]));
  return { body, attrs, ld };
}

/** <main> の中の本文 */
export function mainText(html) {
  const s = html.indexOf('<main');
  const e = html.indexOf('</main>');
  if (s < 0 || e < 0) return '';
  return readableText(html.slice(s, e)).body;
}

/**
 * ページの中のリンク（切り替えの要素の中は除く。切り替えは別に確かめる）
 * @returns {{href:string, text:string}[]}
 */
export function anchorsOf(html) {
  const page = stripComments(html)
    .replace(/<script\b[\s\S]*?<\/script>/g, '')
    .replace(/<style\b[\s\S]*?<\/style>/g, '')
    .replace(/<li data-lang-switch="[^"]*"[^>]*>[\s\S]*?<\/li>/g, '');
  const out = [];
  for (const m of page.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
    const href = /\bhref="([^"]*)"/.exec(m[1])?.[1];
    if (href == null) continue;
    const text = decode(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    out.push({ href: decode(href), text });
  }
  return out;
}

/** サイトの中のリンクなら、そのパス（例 "/en/about/"）。外のサイト・mailto・ページ内の飛び先は null */
export function internalPathOf(href, pagePath) {
  if (/^(mailto:|tel:|javascript:|data:)/i.test(href) || href.startsWith('#')) return null;
  let u;
  try {
    u = new URL(href, `https://farmeolica.com${pagePath}`);
  } catch {
    return null;
  }
  if (u.origin !== 'https://farmeolica.com') return null;
  return decodeURIComponent(u.pathname);
}

/** 組み立て結果の中で、そのパスがどこに当たるか（無ければ null）。kind は 'page'（index.html）か 'file' */
export function resolveInDist(dist, p) {
  const rel = p.replace(/^\//, '');
  const asPage = path.join(dist, rel, 'index.html');
  if (p.endsWith('/') || rel === '') return fs.existsSync(asPage) ? { kind: 'page' } : null;
  const asFile = path.join(dist, rel);
  if (fs.existsSync(asFile) && fs.statSync(asFile).isFile()) return { kind: 'file' };
  return fs.existsSync(asPage) ? { kind: 'page' } : null;
}
