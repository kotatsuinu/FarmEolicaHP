import { defineCollection, z } from 'astro:content';

/**
 * 栽培記録コレクション
 * 日々の農作業や花の成長過程を記録
 */
const cultivationCollection = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    // 基本情報
    title: z.string(),                    // タイトル（例: "カーネーションの定植作業"）
    date: z.date(),                       // 記録日
    description: z.string().optional(),   // 概要説明

    // カテゴリ・タグ
    category: z.enum([
      'planting',      // 定植
      'maintenance',   // 管理
      'harvest',       // 収穫
      'shipping'       // 出荷
    ]),
    flowers: z.array(z.string()),        // 対象花卉（例: ["カーネーション", "トルコキキョウ"]）
    tags: z.array(z.string()).optional(), // タグ（例: ["ハウス栽培", "露地栽培"]）

    // メディア
    coverImage: image().optional(),       // カバー写真
    images: z.array(image()).optional(),  // 追加写真

    // ステータス
    status: z.enum([
      'draft',         // 下書き
      'published',     // 公開済み
      'growing',       // 栽培中
      'harvesting'     // 出荷中
    ]).default('draft'),
    featured: z.boolean().default(false), // 注目記事として表示
  }),
});

/**
 * 商品情報コレクション
 * 販売する花卉の情報
 */
const productsCollection = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    // 基本情報
    name: z.string(),                     // 商品名
    description: z.string(),              // 商品説明
    price: z.number().positive(),         // 価格（円）
    unit: z.string().default('本'),      // 単位（本、束、パックなど）

    // カテゴリ・分類
    category: z.enum([
      'loss_flower',   // ロスフラワー
      'imperfect',     // 規格外
      'market'         // 市場出荷品（展示のみ）
    ]),
    season: z.array(z.enum([
      'spring',        // 春
      'summer',        // 夏
      'autumn',        // 秋
      'winter'         // 冬
    ])).optional(),                       // 旬の季節

    // メディア
    image: image(),                       // 商品画像（必須）
    gallery: z.array(image()).optional(), // ギャラリー画像

    // 在庫・販売情報
    inStock: z.boolean().default(true),   // 在庫有無
    availableFrom: z.date().optional(),   // 販売開始日
    availableUntil: z.date().optional(),  // 販売終了日

    // 特徴・タグ
    flowerType: z.string().optional(),    // 花の種類（例: "カーネーション"）
    tags: z.array(z.string()).optional(), // その他タグ

    // 表示設定
    featured: z.boolean().default(false), // おすすめ商品
    order: z.number().optional(),         // 表示順
  }),
});

export const collections = {
  cultivation: cultivationCollection,
  products: productsCollection,
};
