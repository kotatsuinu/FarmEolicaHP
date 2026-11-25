#!/usr/bin/env node
// 出荷予報の書き出し（入口）。毎朝の自動実行から起動される（段3）。
// 約束：
//   - 鍵は環境変数 CULTIVATION_SNAPSHOT_READER_KEY だけ。書き出し先は <リポジトリ>/src/data/shipment_forecast.json、
//     載せない一覧は <リポジトリ>/src/data/shipment_forecast_hidden.json（このファイルの位置から決める固定のパス）
//   - 「今」は new Date() をここで渡す（部品の側に既定値を持たせない）
//   - 止まったら終了コード 1 で、標準エラーに `::error::shipment_forecast stopped reason=<種類>` の1行を出す
//     警告は `::warning::shipment_forecast kind=<種類> cultivation_no=<番号>` の形（値は出さない）
//   - スタックトレース・例外の本文を出さない
throw new Error('未実装');
