// 出荷予報の書き出し部品：載せない一覧（手で管理する JSON）の読み取り
import { ForecastStop, STOP_REASONS } from './errors.mjs';
import { isObject } from './fields.mjs';

const invalid = () => new ForecastStop(STOP_REASONS.hidden_list_invalid, 'hidden_list_invalid');

// 返す形：[{cultivation_no, reason}]。壊れた一覧・番号が空欄の行は止まる（理由の文字を出さない）
export function parseHiddenList(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw invalid();
  }
  if (!Array.isArray(parsed)) throw invalid();
  return parsed.map((entry) => {
    if (!isObject(entry)) throw invalid();
    const no = entry.cultivation_no;
    const ok = (typeof no === 'string' && no.trim() !== '') || (typeof no === 'number' && Number.isFinite(no));
    if (!ok) throw invalid();
    return { cultivation_no: no, reason: typeof entry.reason === 'string' ? entry.reason : '' };
  });
}
