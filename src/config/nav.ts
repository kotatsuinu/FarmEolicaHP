// 共通の枠（Layout.astro）のメニュー・フッターのリンクとラベル（設計書 §3.2）。
// 英語の相手ページが無いもの（出荷予報・プライバシー・特商法・Works・花信風）は、英語でも日本語のアドレスへ向け、ラベルの後ろに「 (Japanese)」を付ける。
import { SITE_CONFIG } from './site';

export type Lang = 'ja' | 'en';
export interface Bi {
  ja: string;
  en: string;
}
export interface NavLink {
  href: Bi;
  /** 大きい方の表記（SHIPMENT など。両言語とも英字） */
  label: string;
  /** 小さい方の表記（日本語ではメニューの日本語名） */
  sub: Bi;
}
export interface NavChild {
  href: Bi;
  label: Bi;
}

const J = ' (Japanese)';

export const NAV = {
  home: { ja: '/', en: '/en/' } as Bi,
  shipment: {
    href: { ja: '/cultivation', en: '/cultivation' },
    label: 'SHIPMENT',
    sub: { ja: '出荷予報', en: `Shipment forecast${J}` },
  } satisfies NavLink,
  products: {
    href: { ja: '/products', en: '/en/products' },
    label: 'PRODUCTS',
    sub: { ja: '商品・仕組みづくり', en: 'Products & systems' },
    children: [
      { href: { ja: '/products', en: '/en/products' }, label: { ja: '商品紹介', en: 'All products' } },
      { href: { ja: '/products/bouquet', en: '/en/products/bouquet' }, label: { ja: '花束・テーブルフラワー', en: 'Bouquets & table flowers' } },
      { href: { ja: '/products/market', en: '/en/products/market' }, label: { ja: '市場出荷品', en: 'Wholesale market' } },
      { href: { ja: '/products/imperfect', en: '/en/products/imperfect' }, label: { ja: '規格外', en: 'Imperfect flowers' } },
      { href: { ja: '/products/loss-flower', en: '/en/products/loss-flower' }, label: { ja: 'ロスフラワー', en: 'Loss Flower' } },
      { href: { ja: '/products/dry-flower', en: '/en/products/dry-flower' }, label: { ja: 'ドライフラワー', en: 'Dried flowers' } },
      { href: { ja: '/products/research', en: '/en/products/research' }, label: { ja: '農園の仕組みづくり', en: 'Farm systems' } },
    ] satisfies NavChild[],
  },
  about: {
    href: { ja: '/about', en: '/en/about' },
    label: 'ABOUT',
    sub: { ja: '農園について', en: 'About the farm' },
  } satisfies NavLink,
  // 花信風：英語には出さない（Layout 側で lang==='ja' のときだけ描く）。href は site.ts の値
  membership: {
    href: { ja: SITE_CONFIG.membership.applyPath, en: SITE_CONFIG.membership.applyPath },
    label: 'KASHINFU',
    sub: { ja: '花信風（応援会費）', en: `Kashinfu${J}` },
  } satisfies NavLink,
  faq: {
    href: { ja: '/faq', en: '/en/faq' },
    label: 'FAQ',
    sub: { ja: 'よくある質問', en: 'Questions' },
  } satisfies NavLink,
  contact: {
    href: { ja: '/contact', en: '/en/contact' },
    label: 'CONTACT',
    sub: { ja: 'お問い合わせ', en: 'Get in touch' },
  } satisfies NavLink,
};

export const SHIPMENT_PENDING: Bi = { ja: '（準備中）', en: ' (coming soon)' };

export const FOOTER = {
  privacy: { href: { ja: '/privacy', en: '/privacy' }, label: { ja: 'Privacy Policy', en: `Privacy Policy${J}` } },
  tokushoho: {
    href: { ja: SITE_CONFIG.membership.tokushohoPath, en: SITE_CONFIG.membership.tokushohoPath },
    label: { ja: '特定商取引法に基づく表記（お花の販売）', en: `Legal notice for flower sales${J}` },
  },
  works: {
    href: { ja: '/works/', en: '/works/' },
    label: { ja: '関連事業: Farm Eolica Works（制作・Web・デザイン）', en: `Related business: Farm Eolica Works (web & design)${J}` },
  },
};

export const MENU_LABEL = {
  open: { ja: 'メニューを開く', en: 'Open menu' } as Bi,
  close: { ja: 'メニューを閉じる', en: 'Close menu' } as Bi,
};

export const DEFAULT_DESCRIPTION: Bi = {
  ja: 'Farm Eolica - 花農家の栽培記録と商品販売',
  en: 'Farm Eolica - a flower farm in Japan: cultivation records and flowers for sale',
};
