// 出荷予報の書き出し部品：通し（取る → 検査 → 判定 → 書く）
// 止まる道は throw せず exitCode 1 ＋ reason を返す（例外：now の省略は呼び方の誤りなので TypeError）。
// ログ・戻り値に出すのは止まった理由の種類・警告の種類・作付け番号だけ（写しの中身・例外の本文は出さない）
import fsp from 'node:fs/promises';
import { ForecastStop, STOP_REASONS } from './errors.mjs';
import { buildForecast, serializeForecast } from './forecast.mjs';
import { parseHiddenList } from './hidden_list.mjs';
import { validateSnapshotText } from './snapshot.mjs';
import { SNAPSHOT_BUCKET, SNAPSHOT_PATH } from './storage_reader.mjs';

const defaultIo = { readFile: fsp.readFile, writeFile: fsp.writeFile, rename: fsp.rename, unlink: fsp.unlink };

// 設計 §2.3 の 11：書き出す行が0件で、これらの不備で外れた作付けがあれば止まる（冬の0件と見分ける）
const DEFECT_KINDS = new Set([
  'not_an_object',
  'cultivation_no_missing',
  'crop_missing',
  'harvest_start_missing',
  'harvest_start_unreadable',
  'required_field_missing',
  'status_unexpected',
]);

const stop = (reason) => new ForecastStop(STOP_REASONS[reason], reason);

async function fetchSnapshotText(reader) {
  let res;
  try {
    res = await reader.readObject({ bucket: SNAPSHOT_BUCKET, path: SNAPSHOT_PATH });
  } catch {
    throw stop('fetch_failed'); // 通信の例外：本文は読まない・出さない
  }
  if (res === null || typeof res !== 'object' || typeof res.status !== 'number') throw stop('unexpected_error');
  if (res.status === 404) throw stop('snapshot_not_found');
  if (res.status === 401 || res.status === 403) throw stop('snapshot_forbidden');
  if (res.status !== 200 || typeof res.text !== 'string') throw stop('fetch_failed');
  return res.text;
}

async function readHiddenList(io, hiddenListPath) {
  let text;
  try {
    text = await io.readFile(hiddenListPath, 'utf8');
  } catch {
    throw stop('hidden_list_invalid');
  }
  return parseHiddenList(String(text));
}

// 一時ファイルに書いてから置き換える。途中で失敗したら一時ファイルを消し、前の公開ファイルに触らない
async function writeAtomically(io, outPath, text) {
  const tmpPath = `${outPath}.tmp`;
  try {
    await io.writeFile(tmpPath, text, 'utf8');
    await io.rename(tmpPath, outPath);
  } catch {
    try {
      await io.unlink(tmpPath);
    } catch {
      // 一時ファイルが無い・消せない場合は何もしない
    }
    throw stop('write_failed');
  }
}

export async function runForecast({ reader, hiddenListPath, outPath, now, logger, io = defaultIo } = {}) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TypeError('now は有効な Date を必ず渡す');
  }
  const log = {
    info: (m) => logger?.info?.(m),
    warn: (m) => logger?.warn?.(m),
    error: (m) => logger?.error?.(m),
  };
  try {
    const text = await fetchSnapshotText(reader);
    const snapshot = validateSnapshotText(text, now);
    const hidden = await readHiddenList(io, hiddenListPath);
    const { forecast, warnings } = buildForecast(snapshot, hidden);
    // 警告は書き出しの前に出す（全件が不備で外れて止まるときも、どの作付けが何の不備かをログで追えるように）
    for (const w of warnings) log.warn(`shipment_forecast kind=${w.kind} cultivation_no=${w.cultivation_no ?? 'none'}`);
    if (forecast.items.length === 0 && warnings.some((w) => DEFECT_KINDS.has(w.kind))) {
      throw stop('required_fields_missing_all');
    }
    await writeAtomically(io, outPath, serializeForecast(forecast));
    log.info('shipment_forecast wrote');
    return { exitCode: 0, reason: null, warnings, wrote: true };
  } catch (e) {
    const reason = e instanceof ForecastStop ? e.reason : STOP_REASONS.unexpected_error;
    log.error(`shipment_forecast stopped reason=${reason}`);
    return { exitCode: 1, reason, warnings: [], wrote: false };
  }
}
