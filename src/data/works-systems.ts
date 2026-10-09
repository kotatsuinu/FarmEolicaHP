// Farm Eolica Works — 実績システム一覧（手書きデータ）
// 手書きデータ: key・名前・説明文・分類だけを持つ。
// 状態（運用中／開発中／構想中）・noteリンク・最終更新日は works-ledger-status.json
// （反映プログラムだけが書く）にあり、両者を突き合わせて表示用に整えるのは src/data/works.ts。
// このファイルを import してよいのは src/data/works.ts だけ。
// 項目は key・title・description を並べた1行形を保つ（反映プログラムがこの形を読む）。

export type WorksSystemItem = {
  key: string;
  title: string;
  description: string;
};

export type WorksSystemCategory = {
  id: string;
  label: string;
  labelEn: string;
  items: WorksSystemItem[];
};

export const worksSystems: WorksSystemCategory[] = [
  {
    id: 'agri',
    label: '農業・営農DX',
    labelEn: 'AGRI & FARMING',
    items: [
      { key: 'agri-eolica-system', title: 'ハウス環境制御システム（Eolica System）', description: '温度・換気・遮光カーテンをスマホ一画面で遠隔監視・制御するIoTシステム。ラズパイ×ESP32×AWS IoTで24時間自律稼働・自動復旧まで実装済み。' },
      { key: 'agri-cultivation-manager', title: '栽培管理アプリ（Cultivation Manager）', description: '作付けから収穫・出荷まで全データをスマホで一元管理するWebアプリ。作業テンプレートの自動展開・タスク管理・BQ分析連携までひとつのアプリで完結。' },
      { key: 'agri-soil-fertilizer', title: '土壌分析・施肥設計エンジン', description: '土壌分析値を入力すると福島県施肥基準準拠の処方箋を自動計算。Ca:Mg:Kバランス・pH目標・資材選定を7ステップで一括提案。' },
      { key: 'agri-new-crop-selection', title: '新規品目選定・栽培計画支援', description: '市場価格・原価・気候の相性を掛け合わせ、新しく育てる花を選ぶ判断を助ける。作付け計画の意思決定を、数字で後押しする。' },
      { key: 'agri-planting-timeline', title: '作付計画タイムライン & 売上予測', description: 'ガントチャート形式の作付け計画に市場単価データを自動連携し、作付け別の売上予測・予実比較をリアルタイムで可視化。' },
      { key: 'agri-analysis-dashboard', title: '栽培分析ダッシュボード', description: 'BigQueryのデータをWebで可視化する分析基盤。生育ステージ別環境分析・収益性分析・土壌推移・作付け別KPIなど多角的に把握できる。' },
      { key: 'agri-polyculture-board', title: '副作物・多年草管理（Polyculture Board）', description: '主力作付け以外の植物（ハーブ・多年草・副作物）をまとめて管理できる専用ダッシュボード。作付け計画のリスケ機能付き。' },
      { key: 'agri-voice-record', title: '音声入力→栽培記録 自動登録', description: '圃場でスマホに喋るだけでAIが作業内容・使用資材・作付け番号を解釈し、栽培管理アプリに自動登録。記録のために手を止めない農作業環境を目指す。' },
      { key: 'agri-irrigation', title: '灌水自動制御システム', description: 'ESP32×AWS IoTによる圃場灌水制御。仕様・設計・ファームウェア・施工手順書まで完成済み、一部ハウスで本番稼働中。全圃場への展開施工を継続中。' },
    ],
  },
  {
    id: 'automation',
    label: '業務自動化・情報収集',
    labelEn: 'AUTOMATION',
    items: [
      { key: 'auto-openclaw', title: 'AIエージェント基盤（OpenClaw）', description: 'Slack上の自然言語で農業・業務の各種処理を自動化するAIエージェント。栽培照会・市況確認・記録操作など複数スキルをオーケストレーション。' },
      { key: 'auto-knowledge-curator', title: '一次情報のAI自動整理（Knowledge Curator）', description: 'PDF・写真・テキストなど様々な一次情報を、AIが分類し出来事（イベント）として整理して保存する仕組み。Slackに投げ込むだけで、ローカルLLMとGeminiが要約や説明を作る。' },
      { key: 'auto-youtube-capture', title: 'YouTube動画 知識キャプチャ', description: '動画URLをメッセージで送るだけで内容をテキスト化・要約し、知識データベースに自動収録。iPhoneショートカット1タップで投稿可能。' },
      { key: 'auto-actuals-reminder', title: '帳簿滞留アラート（Actuals Reminder）', description: '帳簿データの取込み遅延・停滞を自動検知し、異常時のみSlackに通知する監視システム。平常時は無通知で通知疲れを防止。' },
      { key: 'auto-direct-sales-alert', title: '直売所売上 速報通知', description: '複数直売所の売上データを自動収集し、夕方速報（21:00）と翌朝の確定レポート（9:30）を2段階で通知。' },
      { key: 'auto-inquiry-reply', title: '問い合わせ対応 半自動化', description: 'HP問い合わせメール・Instagram DMを自動整理し、AI返信ドラフトをSlack上で確認。承認ボタンを押すだけで送信まで完結するワークフロー。' },
      { key: 'auto-weekly-diary', title: '週次AI発信システム（FE Weekly Diary）', description: '週の栽培記録・出来事をもとにnote記事ドラフトをAIが自動生成。AI臭排除チェックを経て、週次連載を半自動で維持できる発信基盤。' },
      { key: 'auto-meeting-minutes', title: '会議議事録インテリジェンス', description: '勉強会の録音を投げ込むと、文字起こしから議事録まで自動で作成。会議の記録作業を丸ごと置き換える。' },
      { key: 'auto-slack-reports', title: 'Slack定期レポート・ニュース自動配信', description: '毎朝の目標、週次・月次のレポート、関心に合う週次ニュースをSlackに自動配信。見に行かなくても情報が届く。' },
    ],
  },
  {
    id: 'finance',
    label: '財務・経営管理',
    labelEn: 'FINANCE & OPS',
    items: [
      { key: 'fin-accounting-bq-sync', title: 'クラウド会計→BigQuery 毎日自動同期', description: 'クラウド会計ソフトの全仕訳データを毎日自動でBigQueryに転送。年度をまたいだ収支分析や税務データ確認が即座に行える基盤を構築。' },
      { key: 'fin-bookkeeping-automation', title: '帳簿付け自動化（領収書→仕訳）', description: '領収書をスキャンするだけで仕訳が自動登録され、確定申告レベルまで帳簿が付く。経理の手間を大きく減らす。' },
      { key: 'fin-life-money-board', title: '家計・事業一元管理アプリ（Life Money Board）', description: '事業予算・家計・税試算・借入管理・家族会議レポートを一つのWebアプリで管理。栽培計画との自動連携で「今年の事業キャッシュフロー」をリアルタイムで把握。' },
      { key: 'fin-market-price', title: '花き市場 仕切り価格 自動収集・分析', description: '市場（FAJ）の仕切り価格データを自動収集・BigQuery蓄積し、品目別・時期別の市況推移を可視化。作付け計画の意思決定に活用。' },
      { key: 'fin-budget-app', title: '予算管理アプリ', description: '事業固定費・農業運転資金を年度管理するWebアプリ。NotionからFirestore/BQへ完全移行し、n8nで毎日自動同期。' },
    ],
  },
  {
    id: 'marketing',
    label: '情報発信・マーケティング',
    labelEn: 'MARKETING',
    items: [
      { key: 'mkt-sns-publisher', title: 'Instagram 自動投稿システム（SNS Publisher）', description: '写真・文章の生成から承認・投稿予約・メトリクス収集まで一括自動化。Slack上で承認ボタン1つで投稿完了。農繁期でも途切れない発信基盤を実現。複数の商品キャンペーンを並行して回すこともできる。' },
      { key: 'mkt-official-hp', title: '公式HP（Farm Eolica）', description: 'Astroフレームワークで構築した高速Webサイト。商品ページ・問い合わせフォーム・見積もり計算機・SEO対策（JSON-LD/sitemap/llms.txt）まで一体実装。' },
      { key: 'mkt-document-skills', title: '資料・スライド 変換スキル群', description: 'PDF/画像→HTML化、Markdown→PDF/Word、Markdown→スライド（Marp＋D2図解）など、複数の資料変換ツールをコマンド一発で使用できる。' },
      { key: 'mkt-note-ai-check', title: 'note記事 執筆パイプライン', description: '素材から園主の文体で原稿を起こし、15点のチェックでAIらしい言い回しを取り除く仕組み。記事を自分の言葉で、スムーズに書き上げられる。' },
      { key: 'mkt-podcast', title: '音声配信（Podcast）の自動化', description: 'stand.fmの音声配信で、編集とライブ中のコメント読み上げを自動化する構想。AIと対話しながら配信する仕組みも検討中。' },
      { key: 'mkt-ai-video', title: 'AI動画制作パイプライン', description: '原稿からナレーション付きのプレゼン動画を作り、撮影素材からSNS動画を半自動で仕上げる。演出込みの高品質動画も指示だけで作れるよう、試験運用中。' },
      { key: 'mkt-manuscript-review', title: 'スマホ原稿レビューアプリ', description: 'スマホでnote原稿を読み、段落をタップしてコメントを残すと、AIが読んで原稿を直す。外出先でも推敲が進む。' },
    ],
  },
  {
    id: 'education',
    label: '教育・学習支援',
    labelEn: 'EDUCATION',
    items: [
      { key: 'edu-teaching-materials', title: '英語授業の教材づくり支援アプリ群', description: '音読練習・テスト生成・授業案・ワークシートなど、英語授業の教材づくりをAIで支えるアプリ群。授業準備の時間を減らすことをねらいに作っている。' },
      { key: 'edu-class-feedback', title: '授業振り返り・授業評価の分析', description: '授業ごとの振り返りと授業評価を集めて分析する仕組み。アンケートの集計から傾向の把握までをまとめて行える。' },
    ],
  },
  {
    id: 'other',
    label: 'その他・開発基盤',
    labelEn: 'DEV INFRA',
    items: [
      { key: 'dev-strategy-council', title: '戦略マルチエージェント会議', description: '事業戦略の検討時に、戦略家・批判的レビュアー・市場アナリスト・アーキテクトの4エージェントが並列で意見を出し合うレビューシステム。' },
      { key: 'dev-task-board', title: 'AIと人のタスクボード・自律ループ', description: 'AIと人の間のタスク受け渡しを1画面で見られるボードと、AIの往復対応を自動で回し続ける実行エンジン。バグの自動修正も開発中。' },
      { key: 'dev-knowledge-base', title: '分野別教科書の自動編纂（学習図書館）', description: '取り込んだ資料やWeb調査をAIが分野別の教科書にまとめ直し、更新し続ける仕組み。農業・土壌科学・フローラルクラフトなどの領域で整備を進めている。' },
      { key: 'dev-agri-chat', title: '栽培判断支援AIサポーター', description: '肥料・環境制御・出荷時期の判断を、栽培ガイドを参照してAIが助言する構想。Slackから質問できる形を検討している。' },
      { key: 'dev-custom-skills', title: 'カスタムスキル群（Claude Code）', description: '農場固有の作業（作付け振り返り記録・確定申告前チェック・画像生成など）をコマンド一発で実行できる専用スキルを多数整備。' },
      { key: 'dev-game-hamnies', title: 'ゲーム開発（Hamnies）', description: 'AIと作るゲーム開発スタジオ。共通の土台を整え、探索アドベンチャーや放置系ゲームを開発している。' },
    ],
  },
];
