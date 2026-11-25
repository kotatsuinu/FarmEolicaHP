// 載せない一覧（src/data/shipment_forecast_hidden.json）の読み取り。副作用なし。
// parseHiddenList(text) → [{ cultivation_no, reason }]
//   JSON でない・配列でない・番号が空欄・番号の項目が無い → ForecastStop('hidden_list_invalid')
export function parseHiddenList(text) {
  throw new Error('未実装');
}
