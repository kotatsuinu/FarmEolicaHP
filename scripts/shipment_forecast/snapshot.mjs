// 出荷予報の書き出し部品：写しの検査（設計 §2.3 の 3〜10）
// 1つでも当てはまれば ForecastStop を投げる。エラー文に写しの中身を入れない
import { ForecastStop, STOP_REASONS } from './errors.mjs';
import { isObject, missingRequiredFields, parseDateOnly } from './fields.mjs';

const HOUR_MS = 60 * 60 * 1000;
const STALE_MS = 36 * HOUR_MS; // 36 時間ちょうどは使う
const FUTURE_MS = 5 * 60 * 1000; // 時計のずれとして 5 分先までは許す

const stop = (reason) => new ForecastStop(STOP_REASONS[reason], reason);

// 日本時間の印（+09:00）のある日時だけを読む（実行する PC の時刻帯で読み方が変わらないように）
const JST_DATETIME = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?\+09:00$/;
function parseJstDateTime(value) {
  if (typeof value !== 'string') return null;
  const m = JST_DATETIME.exec(value);
  if (!m || !parseDateOnly(m[1])) return null;
  if (Number(m[2]) > 23 || Number(m[3]) > 59 || Number(m[4]) > 59) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

// now は Date・必須（省略したら TypeError。既定値で時計を見に行かない）
export function validateSnapshotText(text, now) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TypeError('now は有効な Date を必ず渡す');
  }
  let snapshot;
  try {
    snapshot = JSON.parse(text);
  } catch {
    throw stop('json_unreadable');
  }
  if (!isObject(snapshot)) throw stop('version_unknown');
  if (snapshot.snapshot_version !== 1) throw stop('version_unknown');

  const generatedMs = parseJstDateTime(snapshot.generated_at);
  if (generatedMs === null) throw stop('datetime_unreadable');
  const diff = now.getTime() - generatedMs;
  if (diff > STALE_MS) throw stop('snapshot_stale');
  if (-diff > FUTURE_MS) throw stop('future_datetime');

  if (!parseDateOnly(snapshot.generated_for_date)) throw stop('datetime_unreadable');

  if (!isObject(snapshot.main) || !Array.isArray(snapshot.main.cultivations)) throw stop('shape_invalid');
  const cultivations = snapshot.main.cultivations;
  if (cultivations.length === 0) throw stop('zero_cultivations');
  if (cultivations.every((c) => missingRequiredFields(c).length > 0)) throw stop('required_fields_missing_all');
  return snapshot;
}
