// 英語版のテストの期待値（手書き）。実装の i18n-pairs.ts・LangSwitch.astro から写さない・読み込まない。
// 出所：仕様書 hp_english_version_spec.md §2・§4／設計書 §4.1 のペア表・§4.2／テストのあらすじ T-2・T-5・§9（段0の実測）

export const SITE = 'https://farmeolica.com';

// ペア表（設計書 §4.1 の12組を手で写した）。日本語 → 英語
export const PAIRS = [
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
const JA_TO_EN = new Map(PAIRS);

// 写しの中の場所（例 "about/index.html"）→ ページのアドレス（例 "/about/"）
export function pathOf(rel) {
  if (rel === 'index.html') return '/';
  if (!rel.endsWith('/index.html')) return null;
  return `/${rel.slice(0, -'index.html'.length)}`;
}

// 商品1つずつのページ：/products/<種類>/<商品>/（種類のページ /products/<種類>/ は含まない）
export const isProductDetail = (p) => /^\/products\/[^/]+\/[^/]+\/$/.test(p);

// ページの枠の種類。Works のページは WorksHeader、Works の見本サイト（mock）は静的な HTML で枠なし
export function frameOf(p) {
  if (p.startsWith('/works/mock/')) return 'static';
  if (p.startsWith('/works/')) return 'works';
  return 'layout';
}

// 日本語ページで「English」を押したときの行き先（T-5 の表・あらすじ §7 J2）
export function englishTargetOf(p) {
  if (JA_TO_EN.has(p)) return JA_TO_EN.get(p);
  if (isProductDetail(p)) return '/en/products/';
  return '/en/';
}

// ── 許す差（あらすじ §9 許1〜許3・許2 の切り替え）。完全一致の文字列 ──
export const hreflangLinks = (ja, en) => [
  `<link rel="alternate" hreflang="ja" href="${SITE}${ja}">`,
  `<link rel="alternate" hreflang="en" href="${SITE}${en}">`,
  `<link rel="alternate" hreflang="x-default" href="${SITE}${ja}">`,
];
export const OG_LOCALE_ALT_EN = '<meta property="og:locale:alternate" content="en_US">';

// 切り替えの中身（日本語ページ側＝今いる「日本語」は押せない・「English」は英語の相手へ）
const switchInner = (enHref) =>
  ' <span aria-current="true">日本語</span>' +
  ' <span aria-hidden="true" class="opacity-60">/</span>' +
  ` <a href="${enHref}" hreflang="en" lang="en" class="hover:text-old-copper transition-colors duration-300">English</a> `;

// 置き場ごとの切り替え。先頭の空白1つは、前の要素との区切り（段0の実測：本文の要素の間は空白1つ）
export const SWITCHERS = {
  desktop: (h) =>
    ` <li data-lang-switch="desktop" class="flex items-center gap-2 text-xs tracking-widest whitespace-nowrap">${switchInner(h)}</li>`,
  mobile: (h) =>
    ` <li data-lang-switch="mobile" class="flex items-center gap-3 text-sm tracking-widest">${switchInner(h)}</li>`,
  'works-desktop': (h) =>
    ` <span data-lang-switch="works-desktop" class="flex items-center gap-2 text-xs tracking-widest whitespace-nowrap">${switchInner(h)}</span>`,
  'works-mobile': (h) =>
    ` <span data-lang-switch="works-mobile" class="flex items-center gap-3 text-sm tracking-widest">${switchInner(h)}</span>`,
};

// 日本語ページ1枚に許す増分（文字列と、ちょうどの個数）
export function allowedIncrementsFor(p) {
  const frame = frameOf(p);
  if (frame === 'static') return [];
  const target = englishTargetOf(p);
  const out = [];
  if (frame === 'layout') {
    out.push({ name: '切り替え（パソコン）', text: SWITCHERS.desktop(target), count: 1 });
    out.push({ name: '切り替え（スマホ）', text: SWITCHERS.mobile(target), count: 1 });
  } else {
    out.push({ name: '切り替え（Works・パソコン）', text: SWITCHERS['works-desktop'](target), count: 1 });
    out.push({ name: '切り替え（Works・スマホ）', text: SWITCHERS['works-mobile'](target), count: 1 });
  }
  if (JA_TO_EN.has(p)) {
    for (const t of hreflangLinks(p, JA_TO_EN.get(p))) out.push({ name: 'hreflang', text: t, count: 1 });
    out.push({ name: 'og:locale:alternate', text: OG_LOCALE_ALT_EN, count: 1 });
  }
  return out;
}

// 段0の実測（あらすじ §9）
export const LAYOUT_CID = 'data-astro-cid-sckkx6r4'; // 共通の枠（Layout.astro）の印
export const BASELINE_PAGE_COUNT = 60;
export const BASELINE_PRODUCT_DETAIL_COUNT = 24;

// ── 段2：英語ページ（あらすじ T-1・T-2 英語側・T-3・T-5 英語側・T-11）──

// 英語ページ12枚（仕様書 §2 の表。上の PAIRS の英語側と同じ12本）
export const EN_PAGES = PAIRS.map(([, en]) => en);
const EN_TO_JA = new Map(PAIRS.map(([ja, en]) => [en, ja]));
export const japaneseOfEn = (en) => EN_TO_JA.get(en);

// 英語ページが作られてはいけない例（仕様書 §9 ①。実在の商品フォルダ名から手で選んだ3件）
export const EN_MUST_NOT_EXIST = [
  '/en/products/bouquet/01_table-flower/',
  '/en/products/imperfect/07_202607-spray-mum/',
  '/en/products/loss-flower/04_202602-eustoma-loss/',
];

// 英語ページ側の切り替え（今いる「English」は押せない・「日本語」は日本語の相手へ）
const switchInnerEn = (jaHref) =>
  ` <a href="${jaHref}" hreflang="ja" lang="ja" class="hover:text-old-copper transition-colors duration-300">日本語</a>` +
  ' <span aria-hidden="true" class="opacity-60">/</span>' +
  ' <span aria-current="true">English</span> ';
export const SWITCHERS_EN = {
  desktop: (h) =>
    `<li data-lang-switch="desktop" class="flex items-center gap-2 text-xs tracking-widest whitespace-nowrap">${switchInnerEn(h)}</li>`,
  mobile: (h) =>
    `<li data-lang-switch="mobile" class="flex items-center gap-3 text-sm tracking-widest">${switchInnerEn(h)}</li>`,
};

// 英語ページから日本語だけのページへ行くリンクに付ける印（仕様書 §3）
export const JAPANESE_MARK = '(Japanese)';

// 「お届けは日本国内のみ」（仕様書 §6・§9 ②）。訳文一覧で園主が確かめる文。直すときはここと実装の両方を直す
export const DOMESTIC_ONLY = 'We ship within Japan only.';
// その文が出るべきページ（あらすじ T-11：種類のページ5枚・よくある質問・お問い合わせ）
export const DOMESTIC_ONLY_PAGES = [
  '/en/products/bouquet/',
  '/en/products/imperfect/',
  '/en/products/dry-flower/',
  '/en/products/market/',
  '/en/products/loss-flower/',
  '/en/faq/',
  '/en/contact/',
];
// 海外発送を約束するように読める語（あらすじ T-11。英語12枚のどこにも出さない）
export const OVERSEAS_PROMISE = /\b(international(ly)? (shipping|delivery)|ships? internationally|worldwide|overseas|abroad|global(ly)?)\b/i;

// 英語ページの本文（<main> の中）にある英字の下限（T-1「中身が空でない」。いちばん短いお問い合わせでも超える目安）
export const EN_MIN_LETTERS_IN_MAIN = 200;

// 段2：英語ページが増えるとサイトマップに足される行（あらすじ §9 の許す差に足す「許6」。段3で T-9 の形に置き換える）
export const sitemapEnEntries = () =>
  EN_PAGES.map((en) => ({ name: 'サイトマップの英語の行', text: `<url><loc>${SITE}${en}</loc></url>`, count: 1 }));
