import { defineCollection, z } from 'astro:content';

/**
 * 栽培記録コレクション (B2B出荷予報ボード用)
 * 市場関係者向けの出荷予報情報を管理
 */
const cultivationCollection = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    // 基本情報
    title: z.string(),                    // タイトル（例: "カーネーション（ピンク系）"）
    date: z.date(),                       // 記録日
    flowerType: z.string().optional(),    // 花卉種類（例: "カーネーション"）
    variety: z.string().optional(),       // 品種名（例: "ノラ"）

    // 出荷予報情報 (B2B向け)
    status: z.enum([
      'excellent',     // 🟢 順調
      'good',          // 🟡 やや遅延
      'delay',         // 🟠 遅延
      'trouble'        // 🔴 大幅遅延・問題発生
    ]).optional(),
    shippingPeriod: z.string().optional(),           // 出荷予定時期（例: "2025-03下旬"）
    expectedQuantity: z.number().optional(),         // 予想出荷本数

    // 生育データ
    currentHeight: z.number().optional(), // 現在の草丈（cm）
    growthStage: z.string().optional(),   // 生育ステージ（例: "蕾形成期"）
    defects: z.array(z.string()).optional(), // 欠点情報（例: ["葉先枯れ若干あり"]）
    environmentData: z.object({
      temperature: z.number().optional(),
      humidity: z.number().optional(),
      lightHours: z.number().optional(),
    }).optional(),

    // メディア
    images: z.array(z.string()).optional(),  // 定点観測写真 - 文字列パス配列

    // その他
    tags: z.array(z.string()).optional(),
    archived: z.boolean().default(false), // アーカイブフラグ
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
      'craft',         // クラフト用（ドライフラワー向け等）
      'aroma',         // アロマ・香り用
      'market'         // 市場出荷品（展示のみ）
    ]),
    season: z.array(z.enum([
      'spring',        // 春
      'summer',        // 夏
      'autumn',        // 秋
      'winter'         // 冬
    ])).optional(),                       // 旬の季節

    // メディア
    image: z.string(),                    // 商品画像（必須）- 文字列パス
    gallery: z.array(z.string()).optional(), // ギャラリー画像 - 文字列パス配列

    // 在庫・販売情報
    inStock: z.boolean().default(true),   // 在庫有無
    availableFrom: z.date().optional(),   // 販売開始日
    availableUntil: z.date().optional(),  // 販売終了日

    // 特徴・タグ
    flowerType: z.string().optional(),    // 花の種類（例: "カーネーション"）
    tags: z.array(z.string()).optional(), // その他タグ

    // スペック情報（追加）
    spec: z.object({
      length: z.number().optional(),      // 長さ（cm）
      headSize: z.number().optional(),    // 花径（cm）
      color: z.string().optional(),       // 色
      fragrance: z.boolean().optional(),  // 香りの有無
    }).optional(),

    // 表示設定
    featured: z.boolean().default(false), // おすすめ商品
    order: z.number().optional(),         // 表示順
  }),
});

export const collections = {
  cultivation: cultivationCollection,
  products: productsCollection,
};
