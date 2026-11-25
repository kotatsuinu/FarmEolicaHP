// 出荷予報ファイルの読み込みと、公開・読み込み先の設定（段2）。
// ファイルが「無い」ときだけ null。壊れている・形が違う・読めないときは例外（ビルドを失敗させる）。
import fs from 'node:fs';
import path from 'node:path';
import { FORECAST_PUBLISHED } from '../../config/site';
import { parseForecast, type Forecast } from './view';

export interface ForecastSettings {
  published: boolean;
  dataFile: string;
}

export function loadForecastFile(filePath: string): Forecast | null {
  let text: string;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw new Error(`shipment_forecast を読み込めません: ${(e as Error).message}`);
  }
  try {
    return parseForecast(JSON.parse(text));
  } catch (e) {
    throw new Error(`shipment_forecast が壊れています: ${(e as Error).message}`);
  }
}

// FORECAST_PREVIEW・FORECAST_DATA_FILE は確かめ用。本番には設定しない
export function resolveForecastSettings(env: Record<string, string | undefined>): ForecastSettings {
  return {
    published: FORECAST_PUBLISHED === true || env.FORECAST_PREVIEW === 'true',
    dataFile: env.FORECAST_DATA_FILE || path.join(process.cwd(), 'src', 'data', 'shipment_forecast.json'),
  };
}
