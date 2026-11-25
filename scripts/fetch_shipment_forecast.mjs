// 出荷予報の書き出し：本番の入口（毎朝の自動実行から起動する）
// 書き出し先・載せない一覧は、このファイルの位置から決める固定のパス。scripts/ の外のファイルと node_modules に頼らない。
// 止まったら終了コード1・標準エラーに約束の1行だけを出す（スタックトレース・例外の本文は出さない）
import { fileURLToPath } from 'node:url';
import { buildCredentials } from './shipment_forecast/credentials.mjs';
import { ForecastStop, STOP_REASONS } from './shipment_forecast/errors.mjs';
import { runForecast } from './shipment_forecast/run.mjs';
import { createStorageReader } from './shipment_forecast/storage_reader.mjs';

const outPath = fileURLToPath(new URL('../src/data/shipment_forecast.json', import.meta.url));
const hiddenListPath = fileURLToPath(new URL('../src/data/shipment_forecast_hidden.json', import.meta.url));

// 部品のログ（種類と作付け番号だけの短い文）を GitHub の注釈の形で出す
const logger = {
  info: (m) => console.log(m),
  warn: (m) => console.log(`::warning::${m}`),
  error: (m) => console.error(`::error::${m}`),
};

async function main() {
  let reader;
  try {
    const credentials = buildCredentials(process.env);
    reader = createStorageReader({ credentials, fetchImpl: (...args) => globalThis.fetch(...args) });
  } catch (e) {
    const reason = e instanceof ForecastStop ? e.reason : STOP_REASONS.unexpected_error;
    logger.error(`shipment_forecast stopped reason=${reason}`);
    return 1;
  }
  const result = await runForecast({ reader, hiddenListPath, outPath, now: new Date(), logger });
  return result.exitCode;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch(() => {
    logger.error(`shipment_forecast stopped reason=${STOP_REASONS.unexpected_error}`);
    process.exitCode = 1;
  });
