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
 *
 * テンプレートベース管理:
 * - 1商品 = 1フォルダ（例: imperfect/01_2026-summer-lisianthus/）
 * - フォルダ内にindex.md + 画像を配置
 * - _templateフォルダをコピーして新商品追加
 */
const productsCollection = defineCollection({
  type: 'content',
  schema: ({ image }) => z.object({
    // 基本情報
    name: z.string(),                     // 商品名
    description: z.string(),              // 商品説明
    flowerType: z.string(),               // 花の種類（必須: トルコギキョウ、ストック等）

    // カテゴリ・分類
    category: z.enum([
      'loss_flower',   // ロスフラワー（花頭のみ）
      'imperfect',     // 規格外切り花（茎付き）
      'craft',         // クラフト用（ドライフラワー向け等）
      'aroma',         // アロマ・香り用
      'market'         // 市場出荷品（展示のみ）
    ]),

    // 販売時期・ステータス
    availableSeason: z.string(),          // 販売時期（例: "2026年夏", "2026年冬"）
    saleStatus: z.enum([
      'available',      // 販売中
      'out_of_stock',   // 在庫切れ
      'seasonal',       // 季節限定（時期外）
      'discontinued'    // 販売終了
    ]).default('available'),

    // 価格情報
    // ロスフラワー: 価格一律のためpriceは不要（ページレベルで固定表示）
    // 規格外品: 花の種類により単価変動 → priceTableで管理
    price: z.number().positive().optional(),  // 単品価格（任意）
    unit: z.string().default('本'),           // 単位
    priceTable: z.array(z.object({
      size: z.string(),              // "小箱(80サイズ)"
      stemLength: z.string().optional(),  // "約30cm"（規格外品のみ）
      quantity: z.string(),          // "約30本" or "約80輪"
      price: z.number(),             // 2200
      note: z.string().optional(),   // 補足（"単価18%お得"など）
    })).optional(),

    // メディア
    image: image().optional(),            // メイン商品画像（相対パス対応、オプショナル）
    gallery: z.array(image()).optional(), // ギャラリー画像（相対パス対応）

    // 旬の季節（表示用）
    season: z.array(z.enum([
      'spring', 'summer', 'autumn', 'winter'
    ])).optional(),

    // 販売期間
    availableFrom: z.date().optional(),   // 販売開始日
    availableUntil: z.date().optional(),  // 販売終了日

    // 後方互換性（既存データ用）
    inStock: z.boolean().default(true),   // → saleStatusに移行予定

    // 花の特徴（規格外品用）
    features: z.array(z.string()).optional(),     // 花の特徴リスト
    imperfectReasons: z.array(z.string()).optional(), // 規格外となる理由

    // タグ・その他
    tags: z.array(z.string()).optional(),

    // スペック情報
    spec: z.object({
      length: z.number().optional(),      // 長さ（cm）
      headSize: z.number().optional(),    // 花径（cm）
      color: z.string().optional(),       // 色
      fragrance: z.boolean().optional(),  // 香りの有無
    }).optional(),

    // 表示設定
    featured: z.boolean().default(false), // おすすめ商品
    order: z.number().optional(),         // 表示順（連番から自動取得も可）
  }),
});

export const collections = {
  cultivation: cultivationCollection,
  products: productsCollection,
};
