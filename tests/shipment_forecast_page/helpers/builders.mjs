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
