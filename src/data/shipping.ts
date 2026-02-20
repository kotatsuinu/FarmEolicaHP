export type Region =
  | 'hokkaido'
  | 'kita_tohoku'
  | 'minami_tohoku'
  | 'kanto'
  | 'shinetsu'
  | 'tokai'
  | 'hokuriku'
  | 'kansai'
  | 'chugoku'
  | 'shikoku'
  | 'kita_kyushu'
  | 'minami_kyushu'
  | 'okinawa';

export type Size = 60 | 80 | 100 | 140 | 160;

export interface ShippingRate {
  region: Region;
  name: string;
  prefectures: string[];
  prices: Record<Size, number>;
}

// クール便加算料金 (税込)
// 参考: 佐川急便 飛脚クール便付加料金 (2024年4月現在)
export const COOL_FEES: Record<Size, number> = {
  60: 275,
  80: 330,
  100: 440,
  140: 715,
  160: 0, // 140サイズまで推奨、160は要確認
};

// 地域別送料一覧 (税込)
// 発送元: 福島県 (南東北)
// 参考: 佐川急便 飛脚宅配便 料金表 (2025年2月修正版)
export const SHIPPING_RATES: ShippingRate[] = [
  {
    region: 'hokkaido',
    name: '北海道',
    prefectures: ['北海道'],
    prices: {
      60: 1300,
      80: 1590,
      100: 1880,
      140: 2570,
      160: 2830,
    },
  },
  {
    region: 'kita_tohoku',
    name: '北東北',
    prefectures: ['青森県', '秋田県', '岩手県'],
    prices: {
      60: 910,
      80: 1220,
      100: 1520,
      140: 2180,
      160: 2440,
    },
  },
  {
    region: 'minami_tohoku',
    name: '南東北（福島・宮城・山形）',
    prefectures: ['宮城県', '山形県', '福島県'],
    prices: {
      60: 910,
      80: 1220,
      100: 1520,
      140: 2180,
      160: 2440,
    },
  },
  {
    region: 'kanto',
    name: '関東',
    prefectures: ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県', '山梨県'],
    prices: {
      60: 910,
      80: 1220,
      100: 1520,
      140: 2180,
      160: 2440,
    },
  },
  {
    region: 'shinetsu',
    name: '信越',
    prefectures: ['新潟県', '長野県'],
    prices: {
      60: 910,
      80: 1220,
      100: 1520,
      140: 2180,
      160: 2440,
    },
  },
  {
    region: 'tokai',
    name: '東海',
    prefectures: ['静岡県', '愛知県', '岐阜県', '三重県'],
    prices: {
      60: 1040,
      80: 1340,
      100: 1630,
      140: 2310,
      160: 2570,
    },
  },
  {
    region: 'hokuriku',
    name: '北陸',
    prefectures: ['富山県', '石川県', '福井県'],
    prices: {
      60: 1040,
      80: 1340,
      100: 1630,
      140: 2310,
      160: 2570,
    },
  },
  {
    region: 'kansai',
    name: '関西',
    prefectures: ['滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'],
    prices: {
      60: 1180,
      80: 1470,
      100: 1740,
      140: 2440,
      160: 2700,
    },
  },
  {
    region: 'chugoku',
    name: '中国',
    prefectures: ['鳥取県', '島根県', '岡山県', '広島県', '山口県'],
    prices: {
      60: 1440,
      80: 1730,
      100: 2000,
      140: 2710,
      160: 2950,
    },
  },
  {
    region: 'shikoku',
    name: '四国',
    prefectures: ['徳島県', '香川県', '愛媛県', '高知県'],
    prices: {
      60: 1570,
      80: 1840,
      100: 2130,
      140: 2830,
      160: 3090,
    },
  },
  {
    region: 'kita_kyushu',
    name: '北九州',
    prefectures: ['福岡県', '佐賀県', '長崎県', '大分県'],
    prices: {
      60: 1700,
      80: 1960,
      100: 2240,
      140: 2950,
      160: 3210,
    },
  },
  {
    region: 'minami_kyushu',
    name: '南九州',
    prefectures: ['熊本県', '宮崎県', '鹿児島県'],
    prices: {
      60: 1700,
      80: 1960,
      100: 2240,
      140: 2950,
      160: 3210,
    },
  },
  {
    region: 'okinawa',
    name: '沖縄（要確認）',
    prefectures: ['沖縄県'],
    prices: {
      60: 2442,
      80: 3839,
      100: 5753,
      140: 8965,
      160: 12067,
    },
  },
];

export const PREFECTURES = [
  '北海道',
  '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県',
  '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県',
  '沖縄県'
];
