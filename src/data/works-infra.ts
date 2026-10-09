// Farm Eolica Works — 実績を支える基盤技術（手書きデータ）
// 台帳とは同期しない。records.astro の「実績を支える基盤技術」欄だけが使う。
// 書き方: 何のために使っているかを一般の人に分かる1行で。接続の仕組みや設定の詳細は書かない。

export type WorksInfraItem = {
  name: string;
  role: string;
};

export const worksInfra: WorksInfraItem[] = [
  { name: 'Cloudflare', role: 'Webサイトの配信と、管理用の画面へ安全につなぐ仕組みを支えています。' },
  { name: 'n8n', role: 'システム同士をつなぎ、定期処理や通知の流れを自動で回す土台です。' },
  { name: 'Google BigQuery', role: '栽培・販売・会計のデータを1か所に集めて分析する土台です。' },
  { name: 'Firebase', role: '栽培管理や予算管理など、スマホで使うアプリのデータ保存と認証に使っています。' },
  { name: 'Raspberry Pi・ESP32', role: 'ハウスの温度や換気、灌水を現場で測って動かす小型コンピュータです。' },
  { name: 'AWS IoT', role: 'ハウスの機器とクラウドをつなぎ、遠隔監視と制御を支えています。' },
  { name: 'Slack', role: 'AIへの指示、承認、異常の通知など、日々のやり取りの窓口にしています。' },
  { name: 'クラウドAI（Claude・Gemini）', role: '文章の生成、書類の整理、画像の解釈など、判断や作成の部分を担います。' },
  { name: 'ローカルLLM', role: '自前のパソコンで動かすAIで、大量の資料の下処理を費用をかけずに行います。' },
  { name: 'Python', role: '各種の自動処理や、データの収集・変換を書くための主な言語です。' },
  { name: 'Astro・Preact', role: '公式サイトや各種アプリの画面を、軽く速く作るために使っています。' },
  { name: 'GitHub', role: 'プログラムや資料の履歴を残し、AIと一緒に作業を進めるための置き場です。' },
];
