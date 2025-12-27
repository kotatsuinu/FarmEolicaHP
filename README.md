# Farm Eolica Official Website

**Design Concept**: "Organic Lab" (有機的実験室)

Astro v5 + Tailwind CSS + TypeScriptで構築した、Farm Eolicaの公式ウェブサイト。
データドリブンな農業と自然の温かみを融合させた、知的でエモーショナルなデザインを実現しています。

---

## 🛠️ Development Workflow (AI Partner Rules)

このプロジェクトはClaude Codeとの協働開発を前提としています。以下のワークフローを厳守してください。

### 開発フロー

1. **Implementation (実装)**
   Claude Codeがコードの作成・修正を行います。

2. **Verification (検証) - 必須**
   修正後は**必ず**以下を実行し、エラーがないことを確認します:
   ```bash
   npm run build
   ```
   ⚠️ **重要**: ビルドエラーが出た場合は、必ず修正してから次のステップに進むこと。

3. **Handover (引き渡し)**
   ビルド成功を確認後、ユーザーに変更内容を報告します。
   ⚠️ **Note**: Claude Codeは `git commit` / `git push` を**行わない**こと。

4. **Deploy (デプロイ)**
   ユーザーが手動でCommit & Pushを実行。
   GitHub Actions経由で自動的に `dev.farmeolica.com` にデプロイされます。

---

## 📂 Directory Structure (v2.2)

```
FarmEolicaHP/
├── public/
│   ├── images/
│   │   ├── top/              # ヒーロー画像、コンセプトセクション画像
│   │   ├── products/         # 商品画像
│   │   └── cultivation/      # 栽培状況写真（年次フォルダ推奨: 2025/, 2024/）
│   └── favicon.svg
├── src/
│   ├── components/           # Reactコンポーネント（必要に応じて）
│   ├── layouts/
│   │   └── Layout.astro      # 共通レイアウト（ヘッダー・フッター）
│   ├── pages/
│   │   ├── index.astro       # トップページ（Organic Labコンセプト）
│   │   ├── products/         # 商品ページ群
│   │   │   ├── index.astro   # 商品一覧
│   │   │   └── [...slug].astro # 商品詳細
│   │   ├── privacy.astro     # プライバシーポリシー
│   │   └── cultivation/      # 出荷予報ボード（B2B向け）
│   └── content/
│       ├── config.ts         # データスキーマ定義
│       ├── products/         # 商品データ（Markdown）
│       │   ├── loss-flower-carnation.md
│       │   ├── imperfect-stock.md
│       │   └── market-ranunculus.md
│       └── cultivation/      # 栽培記録データ（Markdown）
│           ├── 2025/         # 年次フォルダ管理推奨
│           └── archive/      # 2年以上経過データ
├── tailwind.config.mjs       # Tailwind設定（カラーパレット定義）
├── astro.config.mjs
└── package.json
```

---

## 🎨 Design System (Organic Lab v2.2)

### Color Palette - "Mineral & Soil"

| Color Name       | Hex Code  | Usage                              |
|------------------|-----------|-------------------------------------|
| **Eolica Green** | `#005243` | ブランドカラー、ヘッダーロゴ、英語見出し、フッター背景 |
| **Wet Soil**     | `#4A3B32` | 日本語見出し、強調テキスト、太い線 |
| **Old Copper**   | `#B87333` | ボタン、リンク、ホバーアクション   |
| **Stone White**  | `#F2F2F0` | 背景色（ノイズテクスチャと併用）   |

### Typography

- **Story (感情・物語)**: `font-serif` (Zen Old Mincho) - 本文、日本語見出し
- **Data / System (事実・機能)**: `font-mono` (Courier Prime) - 日付、価格、スペック、英語小見出し
- **Display (象徴)**: `font-display` (Cinzel) - ページタイトル

### Design Principles

- **Breathing Space**: セクション間に大きな余白（`py-32`以上）
- **Broken Grid**: 写真とテキストをあえてずらす、有機的な非対称レイアウト
- **Glass/Paper Box**: コンテンツボックスは `bg-stone-white/95` + `backdrop-blur`
- **Scroll Animations**: `data-animate` 属性でスクロール連動アニメーション

---

## 📄 Content Management

### Products (商品データ)

`src/content/products/` 配下にMarkdownファイルを配置。

**スキーマ** (`src/content/config.ts`):
- `name`, `description`, `price`, `unit`
- `category`: `'loss_flower'`, `'imperfect'`, `'craft'`, `'aroma'`, `'market'`
- `image`: 文字列パス（例: `"/images/products/carnation-mix.jpg"`）
- `season`, `tags`, `spec` (オプション)

### Cultivation (栽培記録・出荷予報データ)

`src/content/cultivation/` 配下に年次フォルダで管理。

**推奨構造**:
```
cultivation/
├── 2025/
│   ├── carnation-pink.md
│   └── stock-white.md
├── 2024/
└── archive/
    └── 2023/
```

**スキーマ**:
- `title`, `date`
- `status`: `'excellent'`, `'good'`, `'delay'`, `'trouble'` (出荷予報ステータス)
- `shippingPeriod`, `expectedQuantity` (B2B向け情報)
- `images`: 文字列パス配列

---

## 🚀 Commands

### Development

```bash
npm run dev
```
開発サーバーを起動します（通常は `http://localhost:4321`）。

### Build (必須確認)

```bash
npm run build
```
本番ビルドを実行します。
⚠️ **重要**: 実装後は必ずこのコマンドを実行し、エラーがないことを確認してください。

### Preview

```bash
npm run preview
```
ビルド結果をローカルでプレビューします。

---

## 🔄 Deployment

### GitHub Actions Workflow

`.github/workflows/deploy.yml` により、以下のフローで自動デプロイされます:

1. **Trigger**: `main` ブランチへのPush
2. **Build**: `npm run build` で静的ファイル生成
3. **Deploy**: SFTP経由で `dev.farmeolica.com` へアップロード

**デプロイ先サーバー**: ConoHa WING
**デプロイURL**: https://dev.farmeolica.com

---

## ⚠️ Important Notes

### For AI Partner (Claude Code)

- **絶対にCommit/Pushしない**: ユーザーが手動で行います。
- **ビルド確認は必須**: `npm run build` でエラーが出ないことを確認してから引き渡してください。
- **画像パスは文字列**: `src/content/` のMarkdownでは、画像パスを文字列で記述してください（Astroの `image()` 関数は使用しません）。

### Known Issues

- **cultivation ディレクトリの警告**: Markdownファイルがない場合、ビルド時に警告が出ますが、エラーではありません。
- **TypeScript hints**: `.map()` の型推論ヒントが出ますが、ビルドには影響しません。

---

## 📚 References

- [Astro Documentation](https://docs.astro.build/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Design Spec (仕様書)](../farm-eolica-docs/03_system/other/HP全体設計仕様書_v2_0.md)

---

## 📝 License

Copyright (c) 2025 Farm Eolica. All rights reserved.
