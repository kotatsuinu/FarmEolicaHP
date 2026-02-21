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
} as const;
