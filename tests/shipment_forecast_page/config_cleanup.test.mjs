// 段2 V24：中身が空の cultivation コレクション定義を外しても他に影響しないこと。
// 外す前は赤（定義が残っている）。products の定義は1文字も変えない（別の会話が手直し中）。
import { describe, test, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'src');
const CONFIG = path.join(SRC, 'content', 'config.ts');

// 検査器（関数にして、陽性コントロールで効くことを確かめる）
export const READ_CULTIVATION_RE = /\b(?:getCollection|getEntry|getEntries|reference)\(\s*['"`]cultivation['"`]/;
export const CONFIG_CULTIVATION_RE = /\bcultivationCollection\b|\bcultivation\s*:/;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(astro|ts|tsx|js|mjs|jsx|md|mdx)$/.test(e.name)) out.push(p);
  }
  return out;
}

describe('検査器そのもの', () => {
  test('CC-0 読み出し・定義の検査が、書き方の違う例をそれぞれ見つける', () => {
    for (const s of [
      "const a = await getCollection('cultivation');",
      'const a = await getCollection( "cultivation" )',
      "getEntry('cultivation', 'x')",
    ]) {
      expect(READ_CULTIVATION_RE.test(s)).toBe(true);
    }
    expect(READ_CULTIVATION_RE.test("getCollection('products')")).toBe(false);
    expect(CONFIG_CULTIVATION_RE.test('export const collections = {\n  cultivation: cultivationCollection,\n}')).toBe(true);
    expect(CONFIG_CULTIVATION_RE.test('export const collections = {\n  products: productsCollection,\n}')).toBe(false);
  });
});

describe('V24 cultivation コレクションの片付け', () => {
  test('V24-1 config.ts に cultivation のコレクション定義も登録も無い', () => {
    const text = fs.readFileSync(CONFIG, 'utf8');
    expect(text.match(CONFIG_CULTIVATION_RE)).toBeNull();
  });

  test('V24-2 products の定義と登録は残っている（巻き込んで消していない）', () => {
    const text = fs.readFileSync(CONFIG, 'utf8');
    expect(text).toMatch(/const productsCollection\s*=\s*defineCollection/);
    expect(text).toMatch(/export const collections\s*=\s*\{[\s\S]*\bproducts\s*:\s*productsCollection/);
  });

  test('V24-3 src の中に cultivation コレクションを読む箇所が0件', () => {
    const hits = [];
    for (const file of walk(SRC)) {
      const text = fs.readFileSync(file, 'utf8');
      if (READ_CULTIVATION_RE.test(text)) hits.push(path.relative(ROOT, file));
    }
    expect(hits).toEqual([]);
  });

  test('V24-4 走査が空振りでない（src の .astro・.ts を十分な数読んでいる）', () => {
    const files = walk(SRC);
    expect(files.length).toBeGreaterThan(20);
    expect(files.some((f) => f.endsWith('cultivation.astro'))).toBe(true);
  });
});
