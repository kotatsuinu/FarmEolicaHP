/**
 * サイト設定ファイル
 * SNS情報やサイト全体で使用する定数を管理
 */

export const SITE_CONFIG = {
  sns: {
    instagram: 'https://www.instagram.com/farm_eolica/',
    note: 'https://note.com/farm_eolica',
    x: 'https://x.com/FarmEolica',
    line: 'https://lin.ee/SJuWU3S',
  },
  noteArticles: {
    lossFlowerStory: 'https://note.com/farm_eolica/n/n046f6ace4f64',
  },
  noteMagazines: {
    farmerLetter: {
      url: 'https://note.com/farm_eolica/m/m55c7e4d169fb',
      title: '農家通信（風の花だより）',
      titleEn: "Farmer's Letter",
      description: '農園の日々や季節の話題をお届けする農家通信です。',
      image: '/images/note/farmer-letter.jpg',
    },
    agriDX: {
      url: 'https://note.com/farm_eolica/m/mbcb8d61660c8',
      title: '農業DX実践シリーズ',
      titleEn: 'Agri-DX Series',
      description: 'IoT・データ活用で農業を進化させる取り組みの記録。',
      image: '/images/note/agri-dx.jpg',
    },
    newFarmerJourney: {
      url: 'https://note.com/farm_eolica/m/m81b58536cf27',
      title: '新規就農リアル体験記',
      titleEn: 'New Farmer Journey',
      description: '新規就農のリアルな道のりを綴っています。',
    },
  },
  contact: {
    email: 'farmeolica@gmail.com',
    lineId: '@218pndaz',
  },
  contactForm: {
    endpoint: 'https://script.google.com/macros/s/AKfycbweUHWWJd5RqR9k7LUCq5w3pBgcVdst10uJ-CyubdSrfqIuaoll_23XuZsJr5sHrGMZ/exec',
    inquiryTypes: [
      { value: 'purchase', label: '商品購入について' },
      { value: 'cultivation-request', label: '栽培リクエスト' },
      { value: 'visit-lecture', label: '講演・見学のご依頼' },
      { value: 'estimate', label: '見積もり・大容量のご相談' },
      { value: 'other', label: 'その他' },
    ],
  },
  person: {
    name: '関口 卓磨',
    alternateName: 'Sekiguchi Takuma',
    jobTitle: '園主（新規就農者）',
    description: 'タウン情報誌の編集者から新規就農。福島県浪江町でFarm Eolica（ファーム・エオリカ）を営み、農研機構「通い農業支援システム」をベースに独自改良したデータ駆動型のスマート農業を実践しながら、トルコギキョウ・スプレーマム・ストック等の花き栽培に取り組む。',
    knowsAbout: ['ロスフラワー', '花き栽培', '新規就農'],
    url: 'https://farmeolica.com/about/',
  },
  business: {
    name: 'Farm Eolica',
    nameJa: 'ファームエオリカ',
    description: '福島県浪江町の花き農園。データ駆動型の栽培管理で、トルコギキョウ・スプレー菊等を生産。',
    url: 'https://farmeolica.com',
    address: {
      postalCode: '979-1501',
      region: '福島県',
      locality: '双葉郡浪江町',
      streetAddress: '',
    },
    geo: {
      latitude: 37.5113,
      longitude: 140.9680,
    },
    foundingDate: '2024',
    logo: '/favicon.svg',
    taxId: 'T1810484782598', // 花卉本体・Works共用のインボイス登録番号
  },
  seo: {
    ga4Id: 'G-KCNMWNSTCG',
    gscVerification: 'G1MpntnYo6biV_pargwybWJHOydpQHdetsxbjFB_Cwc',
  },
  works: {
    name: 'Farm Eolica Works',
    legalName: '関口 卓磨（屋号: Farm Eolica / サブブランド: Farm Eolica Works）',
    description: '福島県浪江町の農家兼元編集者による、Web制作・AI活用業務代行事業。1ページHP・LP制作からAIを活用した月次業務代行まで、取材からデザイン・実装・運用まで一貫して対応します。',
    url: 'https://farmeolica.com/works/',
    founder: '関口 卓磨',
    knowsAbout: [
      'ホームページ制作',
      'ランディングページ制作',
      'AI活用業務代行',
      '農業DX',
      'Web開発',
      '取材・コピーライティング',
    ],
    areaServed: '日本',
    taxId: 'T1810484782598',
  },
  // 応援会費型メンバーシップ「花信風（かしんふう）」
  membership: {
    name: '花信風',
    nameKana: 'かしんふう',
    nameEn: 'Kashinfu',
    annualFee: 13000,                    // 税込・年額
    annualFeeLabel: '13,000円（税込）',
    // 任意の上乗せ額あり（Stripe Payment Link 側の任意 line item で受ける）
    applyPath: '/membership/',
    tokushohoPath: '/law/tokushoho/',
    membersPath: '/members/',
    // Stripe Payment Link。pre-GO はテストモードのみを使い、本番決済を発生させない。
    // 告知GO時に live を本番Linkへ差し替える（空のまま published にするとビルドが失敗する）。
    paymentLink: {
      test: '',   // ← Stripeダッシュボードでテストモードの Payment Link を作成後に貼る
      live: '',   // ← 告知GO時に本番 Payment Link を貼る
    },
  },
} as const;

/**
 * 花信風メンバーシップの公開ゲートフラグ。
 *
 * Cloudflare Pages の環境変数 `MEMBERSHIP_PUBLISHED` を参照する。値が厳密に文字列
 * `'true'` のときだけ公開状態とみなし、それ以外（未定義・'false'・その他の値）は
 * すべて非公開扱い（フェイルクローズ）にする。
 *
 * このファイルはReactクライアントコンポーネントからもimportされる可能性があるため、
 * ブラウザ環境（`process` 未定義）でも例外を投げないようガードしている。
 *
 * GO手順: Cloudflare Pages の環境変数に `MEMBERSHIP_PUBLISHED=true` を設定し、
 * 下記 `SITE_CONFIG.membership.paymentLink.live` に本番 Payment Link を設定した上で
 * 再デプロイする。
 */
export const MEMBERSHIP_PUBLISHED: boolean =
  typeof process !== 'undefined' && process.env
    ? process.env.MEMBERSHIP_PUBLISHED === 'true'
    : false;

/**
 * 花信風メンバーシップの申込み用 Stripe Payment Link。
 *
 * `MEMBERSHIP_PUBLISHED` が true なら本番Link（`paymentLink.live`）、false なら
 * テストモードLink（`paymentLink.test`）を返す。
 *
 * 安全弁: `MEMBERSHIP_PUBLISHED` が true なのに本番Linkが未設定（空文字）の場合は、
 * テスト用リンクのまま公開してしまう事故を防ぐため、ビルド時（Node実行時）に限り
 * エラーを投げてビルドを中断する。ブラウザ実行時はこの安全弁を発火させない。
 */
export const MEMBERSHIP_PAYMENT_LINK: string = (() => {
  const link = MEMBERSHIP_PUBLISHED
    ? SITE_CONFIG.membership.paymentLink.live
    : SITE_CONFIG.membership.paymentLink.test;

  if (MEMBERSHIP_PUBLISHED && !link && typeof process !== 'undefined' && process.env) {
    throw new Error(
      'MEMBERSHIP_PUBLISHED=true だが本番 Payment Link が未設定です。site.ts の membership.paymentLink.live に本番リンクを設定してください（テスト用リンクのまま公開する事故を防ぐためビルドを中断しました）。'
    );
  }

  return link;
})();
