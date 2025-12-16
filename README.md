# Farm Eolica 公式ホームページ

Farm Eolicaの栽培記録と商品販売を行うための公式ホームページです。

## 技術スタック

- **Astro v5** - 静的サイトジェネレーター
- **React** - インタラクティブなコンポーネント用
- **Tailwind CSS** - スタイリング
- **TypeScript** - 型安全性

## プロジェクト構成

```
FarmEolicaHP/
├── .github/
│   └── workflows/
│       └── deploy.yml       # 自動デプロイ設定
├── public/                  # 静的ファイル
│   ├── images/
│   │   ├── cultivation/     # 栽培記録の写真
│   │   ├── products/        # 商品写真
│   │   └── hero/            # ヒーロー画像
│   └── favicon.svg
├── src/
│   ├── components/          # Reactコンポーネント
│   ├── layouts/             # レイアウトコンポーネント
│   ├── pages/               # ページファイル
│   └── content/             # コンテンツ（Markdown + frontmatter）
│       ├── config.ts        # コンテンツスキーマ定義
│       ├── cultivation/     # 栽培記録
│       └── products/        # 商品情報
├── astro.config.mjs         # Astro設定
├── package.json
└── README.md
```

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:4321 を開きます。

### 3. ビルド

```bash
npm run build
```

ビルドされたファイルは `dist/` フォルダに出力されます。

### 4. プレビュー

```bash
npm run preview
```

## コンテンツの追加方法

### 栽培記録を追加

`src/content/cultivation/` フォルダに新しいMarkdownファイルを作成します。

```markdown
---
title: "トマトの定植作業"
date: 2025-05-15
category: "planting"
crops: ["トマト"]
status: "published"
---

本日、トマトの苗を定植しました...
```

### 商品を追加

`src/content/products/` フォルダに新しいMarkdownファイルを作成します。

```markdown
---
name: "有機ミニトマト"
description: "甘くてジューシーな完熟ミニトマト"
price: 500
unit: "パック"
category: "vegetable"
inStock: true
organic: true
---

太陽の光をたっぷり浴びて育った...
```

## デプロイ

GitHub Actionsを使用して自動デプロイされます。
`main` ブランチにプッシュすると、自動的にビルドとデプロイが実行されます。

## コマンド一覧

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバーを起動 |
| `npm run build` | 本番用ビルド |
| `npm run preview` | ビルド結果をプレビュー |
| `npm run astro` | Astro CLIを実行 |

## ライセンス

Copyright (c) 2025 Farm Eolica. All rights reserved.
