// 判定の中心（副作用なし）。時計を見ない：基準日は写しの generated_for_date から取る。
//
// buildForecast(snapshot, hiddenEntries)
//   snapshot: 検査を通った写し／hiddenEntries: parseHiddenList の戻り値
//   戻り値：{ forecast: { generated_at, items: [{ crop, rows: [{ variety, harvest_from, harvest_to, status, section, count_label }] }] },
//            warnings: [{ kind, cultivation_no, field? }] }
//   警告の kind：harvest_start_missing／harvest_start_unreadable／harvest_end_before_start／harvest_end_past_while_harvesting／
//     variety_total_mismatch／count_unreadable／crop_missing／status_unexpected／cultivation_no_missing／
//     required_field_missing（field に項目名）／not_an_object／flag_mismatch／hidden_no_match
//   警告に本数・場所などの値を入れない（作付け番号と種類だけ）
//   並び：品目は1つの crop に1つ。items は品目の最早の収穫開始の月→品目名の順、rows は収穫開始の月→品種名（品種名なしは最後）
export function buildForecast(snapshot, hiddenEntries) {
  throw new Error('未実装');
}

// serializeForecast(forecast) → 文字列（インデント2・LF・末尾に改行1つ。キーの並びは固定）
export function serializeForecast(forecast) {
  throw new Error('未実装');
}
