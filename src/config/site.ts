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
} as const;
