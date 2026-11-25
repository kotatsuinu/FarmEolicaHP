// 画面のテスト用の手書きの入力（合成値。実在の番号・本数は使わない）
export const GEN = '2026-11-13T04:30:00+09:00';

export function row(over = {}) {
  return {
    variety: 'テスト品種',
    harvest_from: '2026-12',
    harvest_to: '2027-01',
    status: 'growing',
    section: 'soon',
    count_label: '約1千本',
    ...over,
  };
}
export function item(crop, rows) {
  return { crop, rows };
}
export function forecast(items, generated_at = GEN) {
  return { generated_at, items };
}
// 入力を変えない確認用：深く凍らせる
export function deepFreeze(o) {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    Object.values(o).forEach(deepFreeze);
  }
  return o;
}
export const NO_PHOTOS = { crops: {} };

// 属性として数える（data-row-index・CSS の [data-row] など別の書き方に当たらない）
export function countAttr(html, name) {
  return [...html.matchAll(new RegExp(`\b${name}(?=[\s=>/])`, 'g'))].length;
}
// 目印（文字列）が html に何個出ているか
export function findMarkers(text, markers) {
  return markers.filter((m) => text.includes(m));
}
// 公開してはいけない目印入りの「知らない項目」（手書き・合成値。作付け番号の形・生の本数・段階名・メモ）
export const LEAK = {
  strings: ['209930', '209931', 'STAGE-LEAK-A1', 'STAGE-LEAK-B1', 'MEMO-LEAK-C1', 'BED-LEAK-D1', 'USER-LEAK-E1'],
  numbers: [7713, 8821],
};
