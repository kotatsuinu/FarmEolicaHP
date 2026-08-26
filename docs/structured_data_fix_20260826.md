# 商品構造化データの修正記録（2026-08-26）

## きっかけ
Google Search Console から2通の警告（2026-08-24 受信）。

| 種別 | 重大な問題 | 重大でない問題 |
|---|---|---|
| 商品スニペット（3件） | `offers` に `price` / `priceSpecification.price` が無い | `aggregateRating` 無し / `review` 無し |
| 販売者のリスティング（4件） | `offers` に `price` が無い | `hasMerchantReturnPolicy` 無し / `shippingDetails` 無し / `category` の値が無効 |

## 原因
`src/components/seo/ProductSchema.astro` のフォールバック分岐が、価格情報を受け取らなかったとき
`price` キーを持たない `Offer` を出力していた。

- ロスフラワー：箱別価格（¥1,300 / ¥2,000 / ¥3,200）は商品ページのJSXに直書きされているだけで、
  frontmatter にも構造化データにも渡っていなかった。
- 市場出荷品（`category: 'market'`、直接購入不可）：購入できないのに `Offer` + `InStock` 相当を出していた。
- `category`：`categoryLabels` の日本語ラベル（"ロスフラワー" 等）をそのまま渡していた。

## 対応（commit `4461294` / develop）
1. `src/config/pricing.ts`（新規）— `LOSS_FLOWER_BOX_PRICING` を新設。
   画面の価格表と構造化データの**唯一の正本**。価格改定はこの1箇所だけ直せばよい。
2. `ProductSchema.astro` — `purchasable` プロパティを追加。
   `purchasable === false` または価格情報が一切無い場合は **`offers` キーごと省略**（price 無し `Offer` は出力しない）。
   `category` も未指定なら省略。
3. `src/pages/products/[...slug].astro` — 価格表を定数からの描画に変更（出力HTMLは変更前と同一）。
   `category` を Google product taxonomy の英語フルパスへマッピング
   （切り花 = `Arts & Entertainment > Party & Celebration > Gift Giving > Fresh Cut Flowers` / ドライ = `Home & Garden > Decor > Dried Flowers`）。
   市場出荷品は `purchasable={false}`。

## 検証（`npm run build` 後の `dist/` 実物で確認）
- ロスフラワー商品：`AggregateOffer` に `lowPrice:1300` / `highPrice:3200` / `priceCurrency:"JPY"` が出力される
- 市場出荷品4ページ：`offers` キーが0件
- `dist` 全体で `price` を持たない `Offer` は **0件**
- `category` は英語2種のみ（日本語ラベルの残存なし）
- 商品ページ17枚のうち13枚に `AggregateOffer`、4枚（市場出荷品）は offers 無し
- 価格表の画面表示（¥1,300 / ¥2,000 / ¥3,200・本数目安・注記・色分け）は変更前と同一

## 📌 フォローアップ（着手判断は保留）
Google の指摘のうち「重大でない（推奨）」項目。検索結果から消える種類の問題ではないため、運用開始後に棚卸しする。

- **F-1 `hasMerchantReturnPolicy`（返品ポリシー）** — 出すには返品条件の文言そのものを決める必要がある。
  ロスフラワー・規格外切り花という商材の性質上、返品可否の方針決定が先。
- **F-2 `shippingDetails`（送料）** — 現状の送料は都道府県別（見積もりフォームで算出）。
  構造化データに載せるには代表値か地域別テーブルの表現方法を決める必要がある。
- **F-3 `aggregateRating` / `review`** — レビュー機能が無い。実データが無いまま出すことはできない。
- **F-4 Google product taxonomy の妥当性** — 「Fresh Cut Flowers (2899)」「Dried Flowers (6936)」で当てているが、
  ロスフラワー（花頭のみ）が本当にこの分類で最適かは Search Console の再クロール結果を見て判断する。
