# 商品データ管理ガイド

> ## ⚠️ 状態・価格・販売時期は、ここを直接書き換えない（2026-09 から）
>
> 商品の **状態（`saleStatus`）・販売時期（`availableSeason`・`availableFrom`・`availableUntil`）・価格まわり・商品名** の正本は、
> 資料のリポジトリの商品カタログ `farm-eolica-docs/02_business/product_catalog/` です。このフォルダの `index.md` は、そこから写された**写し**です。
>
> **手順**: ① カタログの該当ファイルを直す → ② `farm-eolica-openclaw` で `python -m skills.product_catalog.hp_sync` を下見 → ③ 園主の了承 → `--apply` で写す。
> 詳しくは `farm-eolica-docs/02_business/product_catalog/README.md`。
>
> ここだけを直すと、次に反映の道具を使ったときにカタログの値へ**戻ります**（2026-11-13、5商品の「販売終了」がこの形でずれた。記録 → `farm-eolica-docs/03_system/product_catalog/incident_20261113_hp_status_edited_directly.md`）。
> ここで直接直してよいのは、紹介文・写真・タグ・並び順・公開日などカタログが写さない欄だけです。

## フォルダ構成

```
src/content/products/
├── README.md              ← このファイル
├── imperfect/             ← 規格外品
│   ├── _template/         ← テンプレート（コピー元）
│   └── 01_2026-winter-stock/
├── loss-flower/           ← ロスフラワー
│   ├── _template/
│   └── 01_2026-winter-lisianthus/
└── （旧形式の.mdファイル） ← 既存データ、徐々に移行
```

---

## 新商品の追加手順

### 1. テンプレートをコピー

```
imperfect/_template/  →  imperfect/02_2026-summer-carnation/
```

### 2. フォルダ名をリネーム

**推奨フォーマット**: `{連番}_{year}-{season}-{flower-type}/`

| 例 | 説明 |
|----|------|
| `01_2026-winter-stock` | 2026年冬のストック |
| `02_2026-summer-lisianthus` | 2026年夏のトルコギキョウ |
| `03_2026-autumn-carnation` | 2026年秋のカーネーション |

> **注意**: フォルダ名は `_` で始めないこと（無視される）

### 3. index.md を編集

必須フィールド:
- `name`: 商品名
- `description`: 商品説明
- `flowerType`: 花の種類（トルコギキョウ、ストック等）
- `category`: `imperfect` または `loss_flower`
- `availableSeason`: 販売時期（例: "2026年夏"）
- `image`: メイン画像パス

### 4. 画像を配置

画像は `public/images/products/` に配置し、パスを指定:
```yaml
image: "/images/products/my-flower.jpg"
```

### 5. 販売状況を設定

新商品はカタログに1ファイル足してから、反映の道具で写す（冒頭の⚠️）。`saleStatus` を手で書かない。

---

## 販売状況の変更

**ここは直接変えない。** カタログの `status` を直して反映の道具で写す（冒頭の⚠️）。値の意味は次のとおり:

| 値 | 意味 | 表示 |
|----|------|------|
| `available` | 販売中 | 「販売中」バッジ付きで上位表示 |
| `out_of_stock` | 在庫切れ | 「在庫切れ」表示 |
| `seasonal` | 季節限定（時期外） | 「季節限定」表示 |
| `discontinued` | 販売終了 | 「販売終了」表示、下位に移動 |

---

## 商品の並び順ルール

サイト上での商品表示順序:

### 1. saleStatus による優先度（高い順）
1. `available`（販売中）← 最優先
2. `out_of_stock`（在庫切れ）
3. `seasonal`（季節限定）
4. `discontinued`（販売終了）← 最後

### 2. 同じステータス内での順序
`order` フィールドの数値で昇順ソート

```yaml
order: 1   # 先頭に表示
order: 2   # 2番目
order: 10  # 後ろの方
```

> `order` 未指定の場合は最後尾に表示

### 例
| 商品 | saleStatus | order | 表示順 |
|------|------------|-------|--------|
| トルコギキョウ | available | 1 | 1番目 |
| ストック | available | 2 | 2番目 |
| カーネーション | discontinued | 1 | 3番目 |

---

## 価格設定の違い

### 規格外品（imperfect）
花の種類により価格が異なる → **priceTable で設定**

```yaml
priceTable:
  - size: "小箱(80サイズ)"
    stemLength: "約30cm"
    quantity: "約30本"
    price: 2200
  - size: "中箱(100サイズ)"
    stemLength: "約40cm"
    quantity: "約50本"
    price: 3500
```

### ロスフラワー（loss_flower）
花の種類に関わらず価格一律 → **ページで固定表示**

`priceTable` は設定不要（ページ側で共通価格を表示）

---

## よくある質問

### Q: フォルダ名に規則は必須？
A: 必須ではないが、推奨。`_`で始まらなければ認識される。

### Q: 画像はどこに置く？
A: `public/images/products/` に配置。パスは `/images/products/xxx.jpg` 形式で指定。

### Q: 商品を非表示にしたい
A: カタログの `status` を `discontinued` にして反映の道具で写すか、フォルダ名を `_` で始める名前に変更（フォルダ名の変更はカタログの `hp_slug` も合わせて直す）。

### Q: 表示順を変えたい
A: `order` フィールドの数値を変更。小さい数字が先に表示。

### Q: ギャラリー画像は何枚まで載せられる？
A: **枚数上限なし**（v2.7改修で撤廃、2026-05-08）。詳細ページではメインと結合されて4秒間隔の自動スライドショーで循環、サムネグリッドは6点表示＋7枚目以降は縦スクロール、クリックで全画面ライトボックス起動。**5〜10枚程度を推奨**（自動スライドのテンポと体験バランス）。詳しくは `farm-eolica-docs/03_system/official_website/product_management_manual.md` §5。

---

最終更新: 2026-11-13（状態・価格・時期はカタログが正本と明記）
