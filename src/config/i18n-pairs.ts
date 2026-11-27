// 日本語ページと英語ページのペア表（設計書 §4.1）。パスは末尾 / ありの形（Astro.url.pathname の形）
export const I18N_PAIRS: ReadonlyArray<readonly [ja: string, en: string]> = [
  ['/', '/en/'],
  ['/about/', '/en/about/'],
  ['/products/', '/en/products/'],
  ['/products/bouquet/', '/en/products/bouquet/'],
  ['/products/imperfect/', '/en/products/imperfect/'],
  ['/products/dry-flower/', '/en/products/dry-flower/'],
  ['/products/market/', '/en/products/market/'],
  ['/products/loss-flower/', '/en/products/loss-flower/'],
  ['/products/research/', '/en/products/research/'],
  ['/loss-flower/', '/en/loss-flower/'],
  ['/faq/', '/en/faq/'],
  ['/contact/', '/en/contact/'],
];

const JA_TO_EN = new Map<string, string>(I18N_PAIRS);
const EN_TO_JA = new Map<string, string>(I18N_PAIRS.map(([ja, en]) => [en, ja]));

const withSlash = (p: string) => (p.endsWith('/') ? p : `${p}/`);

/** ペアがあれば { ja, en }、なければ null（日本語・英語どちらのパスを渡してもよい） */
export function getAlternate(pathname: string): { ja: string; en: string } | null {
  const p = withSlash(pathname);
  if (JA_TO_EN.has(p)) return { ja: p, en: JA_TO_EN.get(p)! };
  if (EN_TO_JA.has(p)) return { ja: EN_TO_JA.get(p)!, en: p };
  return null;
}

/** /products/<種類>/<商品>/ （商品1つずつのページ） */
const isProductDetail = (p: string) => /^\/products\/[^/]+\/[^/]+\/$/.test(p);

/** 日本語ページで「English」を押したときの行き先 */
export function englishTargetOf(pathname: string): string {
  const p = withSlash(pathname);
  if (JA_TO_EN.has(p)) return JA_TO_EN.get(p)!;
  if (isProductDetail(p)) return '/en/products/';
  return '/en/';
}

/** 英語ページで「日本語」を押したときの行き先（ペアの日本語側。無ければトップ） */
export function japaneseTargetOf(pathname: string): string {
  const p = withSlash(pathname);
  return EN_TO_JA.get(p) ?? '/';
}
