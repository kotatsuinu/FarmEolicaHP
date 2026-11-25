// 書き出し部品の通し（取る → 検査 → 判定 → 書く）。副作用はここだけ。
//
// runForecast({ reader, hiddenListPath, outPath, now, logger, io })
//   reader: { readObject({ bucket, path }) }／hiddenListPath: 載せない一覧のパス／outPath: 書き出し先
//   now: Date（必須。省略時の既定値なし）／logger: { info, warn, error }（文字列を1つ受ける）
//   io: { readFile, writeFile, rename, unlink }（省略時は node:fs/promises）
//   戻り値：{ exitCode: 0|1, reason: string|null, warnings: [...], wrote: boolean }
//   止まる道は throw せず exitCode 1 と reason を返す。書き出しは全部の検査を通ったあとだけ。
//   一時ファイルに書いて置き換える。途中で失敗したら一時ファイルを消し、前の公開ファイルに触らない。
//   ログ・戻り値・例外文に写しの中身や例外の本文を出さない（作付け番号と種類だけ）
export async function runForecast({ reader, hiddenListPath, outPath, now, logger, io }) {
  throw new Error('未実装');
}
