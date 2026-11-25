// 出荷予報ページの「表示用の形」を作る純粋な関数（段2）。
// いまは入れ物だけ（中身は実装の担当が書く）。ファイル読み・Astro には依存しない。

export type ForecastStatus = 'seedling' | 'growing' | 'bud' | 'harvesting';
export type ForecastSection = 'shipping' | 'soon' | 'later';

export interface ForecastRow {
  variety: string | null;
  harvest_from: string;
  harvest_to: string | null;
  status: ForecastStatus;
  section: ForecastSection;
  count_label: string | null;
}

export interface ForecastItem {
  crop: string;
  rows: ForecastRow[];
}

export interface Forecast {
  generated_at: string;
  items: ForecastItem[];
}

export interface PhotoEntry {
  src: string;
  alt: string;
}

export interface PhotoMap {
  crops: Record<string, PhotoEntry & { varieties?: Record<string, PhotoEntry> }>;
}

export interface ViewRow {
  variety: string | null;
  months: string;
  statusLabel: string;
  countLabel: string | null;
}

export interface ViewItem {
  crop: string;
  photo: PhotoEntry | null;
  contactHref: string;
  rows: ViewRow[];
}

export interface ViewSection {
  key: ForecastSection;
  title: string;
  items: ViewItem[];
}

export type ForecastView =
  | { state: 'missing' }
  | { state: 'empty'; asOf: string; generatedAt: string }
  | { state: 'present'; asOf: string; generatedAt: string; sections: ViewSection[] };

export function parseForecast(_raw: unknown): Forecast {
  throw new Error('未実装');
}

export function formatAsOf(_generatedAt: string): string {
  throw new Error('未実装');
}

export function formatHarvestMonths(_from: string, _to: string | null, _baseYear: number): string {
  throw new Error('未実装');
}

export function buildForecastView(_input: { forecast: Forecast | null; photos: PhotoMap }): ForecastView {
  throw new Error('未実装');
}
