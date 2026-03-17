/**
 * 研究成果ページ — アプリショーケースデータ
 * デモURLはCloudflare Pagesデプロイ後に設定
 */

export interface ResearchApp {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  features: string[];
  techStack: string[];
  demoUrl: string | null;
  noteUrl?: string;
  status: 'live' | 'demo' | 'coming-soon';
}

export const researchApps: ResearchApp[] = [
  {
    id: 'cultivation-manager',
    title: '栽培管理システム',
    titleEn: 'CULTIVATION MANAGER',
    description:
      '多品目花卉栽培の作業記録・生育管理・出荷予測を一元管理するWebアプリ。' +
      'IoTセンサーデータとの連携により、環境データに基づく栽培判断を支援します。',
    features: [
      '品種別の作業記録・生育ステージ管理',
      '労務・資材コストの記録と損益分析',
      'IoT環境データ（温湿度・日射量）の可視化',
      'BigQueryによる栽培データ分析基盤',
    ],
    techStack: ['Astro', 'Preact', 'Tailwind CSS', 'Firebase', 'BigQuery'],
    demoUrl: 'https://demo-cultivation-manager.pages.dev',
    noteUrl: 'https://note.com/farm_eolica/m/mbcb8d61660c8',
    status: 'demo',
  },
  {
    id: 'polyculture-board',
    title: '混植ボード',
    titleEn: 'POLYCULTURE BOARD',
    description:
      '多品目混植栽培の作付け計画・管理ログを可視化するボードアプリ。' +
      '品種ごとの管理テンプレートに基づき、栽培フェーズに応じたタスクを提案します。',
    features: [
      '作付け記録のカンバン表示',
      '品種マスタと管理テンプレート',
      '管理ログのタイムライン表示',
      '気象データとの連携（予定）',
    ],
    techStack: ['Astro', 'Preact', 'Tailwind CSS', 'Firebase'],
    demoUrl: 'https://demo-polyculture-board.pages.dev',
    status: 'demo',
  },
  {
    id: 'analytics-dashboard',
    title: '経営分析ダッシュボード',
    titleEn: 'ANALYTICS DASHBOARD',
    description:
      'BigQueryの栽培・出荷・売上データを統合分析するダッシュボード。' +
      'Looker Studio 6レポートを統合し、経営判断に必要なKPIを一画面で把握できます。',
    features: [
      '売上・出荷の品種別・月別分析',
      '労務コストと収益性の可視化',
      '直売所・卸売の販路別パフォーマンス',
      '栽培計画の進捗モニタリング',
    ],
    techStack: ['Streamlit', 'BigQuery', 'Plotly', 'Python'],
    demoUrl: 'https://demo-analytics.pages.dev',
    status: 'demo',
  },
];
