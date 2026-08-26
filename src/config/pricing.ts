export interface BoxPricingTier {
  size: string;
  quantity: string;
  price: number;
  note?: string;
  noteHighlight?: boolean; // trueならnoteをtext-eolica-greenで表示
}

/** ロスフラワーの箱サイズ別価格（税込・送料別）。画面の価格表とProduct構造化データの唯一の正本 */
export const LOSS_FLOWER_BOX_PRICING: BoxPricingTier[] = [
  { size: '小箱（60サイズ）', quantity: '約80輪', price: 1300, note: '個人クラフト・撮影に' },
  { size: '中箱（80サイズ）', quantity: '約160輪', price: 2000, note: '中規模アレンジに' },
  { size: '大箱（100サイズ）', quantity: '約320輪', price: 3200, note: '単価18%お得', noteHighlight: true },
];
