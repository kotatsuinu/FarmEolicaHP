// 写しの検査（設計書 §2.3 の 4〜10）。副作用なし。
// validateSnapshotText(text, now)
//   text: 保管庫から取った文字列／now: Date（必須。省略時の既定値を持たない＝省略したら TypeError）
//   戻り値：検査を通った写し（パース済みオブジェクト）
//   止まるときは ForecastStop（reason は errors.mjs）。エラー文に写しの中身（読んだ値）を含めない
export function validateSnapshotText(text, now) {
  throw new Error('未実装');
}
