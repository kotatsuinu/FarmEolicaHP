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
│   │   ├── cultivation/      # 栽培状況写真（年次フォルダ推奨: 2025/, 2024/）
│   │   └── instagram/        # Instagram自動取得画像（01.jpg〜09.jpg）
│   └── favicon.svg
├── scripts/
│   └── fetch_instagram.mjs   # Instagram画像自動取得スクリプト
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

### GitHub Actions Workflows

#### 1. Deploy Workflow (`.github/workflows/deploy.yml`)

`main` ブランチへのPushで自動デプロイされます:

1. **Trigger**: `main` ブランチへのPush
2. **Build**: `npm run build` で静的ファイル生成
3. **Deploy**: SFTP経由で `dev.farmeolica.com` へアップロード

**デプロイ先サーバー**: ConoHa WING
**デプロイURL**: https://dev.farmeolica.com

#### 2. Instagram Sync Workflow (`.github/workflows/instagram_sync.yml`)

毎日自動でInstagram画像を更新します:

1. **Trigger**: 毎日 JST 3:00 / 手動実行
2. **Fetch**: Instagram Graph APIから最新9件の画像を取得
3. **Save**: `public/images/instagram/` に画像を保存
4. **Commit**: 差分がある場合のみ自動コミット & プッシュ

---

## 📸 Instagram Images Auto-Sync

トップページに表示するInstagram画像を自動で最新の状態に更新するシステムです。

### システム概要

- **スクリプト**: `scripts/fetch_instagram.mjs`
- **実行頻度**: 毎日 JST 3:00 (GitHub Actions)
- **取得件数**: 最新9件のInstagram投稿画像
- **保存先**: `public/images/instagram/01.jpg` 〜 `09.jpg`

### セットアップ

#### 1. GitHubリポジトリのSecretsを設定

以下の環境変数をGitHub Secretsに登録してください:

- `IG_BUSINESS_ID`: Instagram Business Account ID
- `IG_ACCESS_TOKEN`: Instagram Graph API Access Token (長期トークン)
- `FB_APP_ID`: Facebook App ID
- `FB_APP_SECRET`: Facebook App Secret

**設定方法**:
1. GitHubリポジトリページで `Settings` > `Secrets and variables` > `Actions`
2. `New repository secret` をクリック
3. 上記の4つのSecretsを追加

#### 2. Instagram Graph API トークンの取得

1. [Facebook for Developers](https://developers.facebook.com/)でアプリを作成
2. Instagram Basic Display APIまたはInstagram Graph APIを有効化
3. Access Tokenを生成（長期トークン推奨、60日間有効）
4. トークンの延長: スクリプトが7日以内に期限切れを検出すると自動延長を試みます

#### 3. ワークフローの確認

`.github/workflows/instagram_sync.yml` により、以下のスケジュールで自動実行されます:

- **定期実行**: 毎日 JST 3:00 (UTC 18:00)
- **手動実行**: GitHubリポジトリの `Actions` タブから手動でも実行可能

### トラブルシューティング

#### トークンの有効期限切れ

ワークフローのログに以下の警告が表示された場合:

```
⚠️ WARNING: Token will expire in X days
```

トークンの有効期限が近づいています。以下の手順で新しいトークンを取得してください:

1. Facebook Graph API Explorerで新しいトークンを生成
2. GitHub Secretsの `IG_ACCESS_TOKEN` を更新

#### スクリプトのローカル実行

```bash
# 環境変数を設定
export IG_BUSINESS_ID="your_business_id"
export IG_ACCESS_TOKEN="your_access_token"
export FB_APP_ID="your_app_id"
export FB_APP_SECRET="your_app_secret"

# スクリプトを実行
node scripts/fetch_instagram.mjs
```

#### APIエラーの確認

GitHub Actionsのログを確認してください:
1. リポジトリページで `Actions` タブを開く
2. `Instagram Images Sync` ワークフローを選択
3. 最新の実行ログを確認

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
