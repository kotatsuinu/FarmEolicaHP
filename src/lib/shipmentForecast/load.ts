// 出荷予報ファイルの読み込みと、公開・読み込み先の設定（段2）。いまは入れ物だけ。
import type { Forecast } from './view';

export interface ForecastSettings {
  published: boolean;
  dataFile: string;
}

export function loadForecastFile(_filePath: string): Forecast | null {
  throw new Error('未実装');
}

export function resolveForecastSettings(_env: Record<string, string | undefined>): ForecastSettings {
  throw new Error('未実装');
}
