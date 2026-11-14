/**
 * 商品カテゴリーページ共通：商品の取り出しと振り分け
 *  棚      = 販売中・季節限定
 *  あとで  = 在庫切れ・準備中
 *  これまで = 販売終了
 */
import type { CollectionEntry } from 'astro:content';

export type ProductEntry = CollectionEntry<'products'>;

// 販売中を先に、その後は表示順（従来の各ページと同じ並び）
export const sortProducts = (items: ProductEntry[]): ProductEntry[] =>
  [...items].sort((a, b) => {
    if (a.data.saleStatus === 'available' && b.data.saleStatus !== 'available') return -1;
    if (a.data.saleStatus !== 'available' && b.data.saleStatus === 'available') return 1;
    return (b.data.order || 999) - (a.data.order || 999);
  });

export const byCategory = (all: ProductEntry[], category: string): ProductEntry[] =>
  sortProducts(all.filter((p) => p.data.category === category));

export const splitByStatus = (items: ProductEntry[]) => ({
  shelf: items.filter((p) => p.data.saleStatus === 'available' || p.data.saleStatus === 'seasonal'),
  later: items.filter((p) => p.data.saleStatus === 'out_of_stock' || p.data.saleStatus === 'preparing'),
  past: items.filter((p) => p.data.saleStatus === 'discontinued'),
});
