// 「止まる」入力の一覧（手書き）。検査の中身は snapshot_validation.test.mjs、前の日のファイルが変わらないことは keep_previous.test.mjs（GK1）
// どちらも同じ一覧を使う。件数は STOP_CASE_COUNT（手で数えた）と突き合わせる
import { MISSING } from './builders.mjs';
import { sf, sfText } from './fixtures.mjs';
import { realIo } from './harness.mjs';
import { R } from './reasons.mjs';

export const NOW_OK = '2026-11-16T19:30:00Z'; // 日本時間 11/17 4:30＝写し（11/17 4:00）の30分後
export const STOP_CASE_COUNT = 48;

// 写し SF1 の表紙・作付けを1か所だけ変えた文字列
function mutated(fn) {
  const s = sf(1);
  fn(s);
  return JSON.stringify(s);
}
function setTop(key, value) {
  return mutated((s) => {
    if (value === MISSING) delete s[key];
    else s[key] = value;
  });
}
function setMain(value) {
  return mutated((s) => {
    if (value === MISSING) delete s.main;
    else s.main = value;
  });
}
function setCultivations(value) {
  return mutated((s) => {
    if (value === MISSING) delete s.main.cultivations;
    else s.main.cultivations = value;
  });
}
// 3件とも、同じ項目を欠落させた写し（GV8）
function allMissing(field, how) {
  return mutated((s) => {
    const base = s.main.cultivations[0];
    s.main.cultivations = [0, 1, 2].map((i) => {
      const c = structuredClone(base);
      c.cultivation_no = `20993${i}`;
      how(c, field);
      return c;
    });
  });
}
const drop = (c, f) => delete c[f];
const toNull = (c, f) => {
  c[f] = null;
};
const rename = (c, f) => {
  c.flowerType = c[f];
  delete c[f];
};

const trunc = () => {
  const t = sfText(10);
  const needle = '"location": "LOC-MARK-01"';
  return t.slice(0, t.indexOf(needle) + needle.length);
};
export const TRUNCATED_TEXT = trunc;

export const STOP_CASES = [
  // 取得（GA）
  { id: 'GA2', reason: R.notFound, now: NOW_OK, readerOpts: { status: 404 } },
  { id: 'GA3', reason: R.forbidden, now: NOW_OK, readerOpts: { status: 403 } },
  { id: 'GA4', reason: R.fetchFailed, now: NOW_OK, readerOpts: { throwError: new Error('通信の失敗 EXC-MARK-GA4 LOC-MARK-01') } },
  // 版（GV2・GV3）
  { id: 'GV2-版2', reason: R.versionUnknown, now: NOW_OK, snapshotText: setTop('snapshot_version', 2) },
  { id: 'GV2-版0', reason: R.versionUnknown, now: NOW_OK, snapshotText: setTop('snapshot_version', 0) },
  { id: 'GV3-文字列', reason: R.versionUnknown, now: NOW_OK, snapshotText: setTop('snapshot_version', '1') },
  { id: 'GV3-真偽', reason: R.versionUnknown, now: NOW_OK, snapshotText: setTop('snapshot_version', true) },
  { id: 'GV3-配列', reason: R.versionUnknown, now: NOW_OK, snapshotText: setTop('snapshot_version', [1]) },
  { id: 'GV3-小数', reason: R.versionUnknown, now: NOW_OK, snapshotText: setTop('snapshot_version', 1.5) },
  { id: 'GV3-null', reason: R.versionUnknown, now: NOW_OK, snapshotText: setTop('snapshot_version', null) },
  { id: 'GV3-欠落', reason: R.versionUnknown, now: NOW_OK, snapshotText: setTop('snapshot_version', MISSING) },
  // JSON（GV4）
  { id: 'GV4-途中で切れた', reason: R.jsonUnreadable, now: NOW_OK, snapshotText: trunc() },
  { id: 'GV4-空', reason: R.jsonUnreadable, now: NOW_OK, snapshotText: '' },
  // 形（GV5・GV6・GV7）
  { id: 'GV5-配列', reason: R.shapeInvalid, now: NOW_OK, snapshotText: setMain([]) },
  { id: 'GV5-文字列', reason: R.shapeInvalid, now: NOW_OK, snapshotText: setMain('テキスト') },
  { id: 'GV5-null', reason: R.shapeInvalid, now: NOW_OK, snapshotText: setMain(null) },
  { id: 'GV5-欠落', reason: R.shapeInvalid, now: NOW_OK, snapshotText: setMain(MISSING) },
  { id: 'GV6-オブジェクト', reason: R.shapeInvalid, now: NOW_OK, snapshotText: setCultivations({}) },
  { id: 'GV6-null', reason: R.shapeInvalid, now: NOW_OK, snapshotText: setCultivations(null) },
  { id: 'GV6-欠落', reason: R.shapeInvalid, now: NOW_OK, snapshotText: setCultivations(MISSING) },
  { id: 'GV7', reason: R.zeroCultivations, now: NOW_OK, snapshotText: setCultivations([]) },
  // 必須の項目が全作付けで欠落（GV8）
  { id: 'GV8-品目名', reason: R.requiredAllMissing, now: NOW_OK, snapshotText: allMissing('flower_type', rename) },
  { id: 'GV8-収穫開始', reason: R.requiredAllMissing, now: NOW_OK, snapshotText: allMissing('harvest_start', toNull) },
  { id: 'GV8-status', reason: R.requiredAllMissing, now: NOW_OK, snapshotText: allMissing('status', drop) },
  { id: 'GV8-旗', reason: R.requiredAllMissing, now: NOW_OK, snapshotText: allMissing('variety_counts_usable', drop) },
  { id: 'GV8-品種', reason: R.requiredAllMissing, now: NOW_OK, snapshotText: allMissing('varieties', drop) },
  { id: 'GV8-段階', reason: R.requiredAllMissing, now: NOW_OK, snapshotText: allMissing('current_stage', drop) },
  // 基準日（GV9）
  ...[['スラッシュ', '2026/11/17'], ['abc', 'abc'], ['存在しない日', '2026-02-30'], ['存在しない月', '2026-13-40'], ['null', null], ['欠落', MISSING]].map(
    ([label, v]) => ({ id: `GV9-${label}`, reason: R.datetimeUnreadable, now: NOW_OK, snapshotText: setTop('generated_for_date', v) }),
  ),
  // 古さ・先の日時（GF）。写しを作った日時 2026-11-17T04:00:00+09:00＝2026-11-16T19:00:00Z
  { id: 'GF4', reason: R.stale, now: '2026-11-18T07:00:01Z', snapshotText: sfText(1) },
  { id: 'GF5', reason: R.stale, now: '2026-11-18T19:30:00Z', snapshotText: sfText(1) },
  { id: 'GF6', reason: R.stale, now: '2026-11-18T10:30:00Z', snapshotText: sfText(1) },
  { id: 'GF7', reason: R.stale, now: '2026-11-18T19:30:00Z', snapshotText: setTop('generated_at', '2026-11-17T13:00:00+09:00') },
  { id: 'GF9', reason: R.future, now: '2026-11-16T18:54:59Z', snapshotText: sfText(1) },
  ...[['空白区切り', '2026-11-17 04:00'], ['印なし', '2026-11-17T04:00:00'], ['abc', 'abc'], ['null', null], ['欠落', MISSING]].map(
    ([label, v]) => ({ id: `GF10-${label}`, reason: R.datetimeUnreadable, now: NOW_OK, snapshotText: setTop('generated_at', v) }),
  ),
  { id: 'GF11', reason: R.stale, now: '2026-11-18T11:00:00Z', snapshotText: sfText(1), readerOpts: { updated: '2026-11-18T11:00:00.000Z' } },
  // 載せない一覧の異常（H6）
  { id: 'H6-ファイルなし', reason: R.hiddenInvalid, now: NOW_OK, snapshotText: sfText(1), hiddenAbsent: true },
  { id: 'H6-壊れたJSON', reason: R.hiddenInvalid, now: NOW_OK, snapshotText: sfText(1), hidden: '{bad json' },
  { id: 'H6-番号が空欄', reason: R.hiddenInvalid, now: NOW_OK, snapshotText: sfText(1), hidden: '[{"cultivation_no": ""}]' },
  // 書き込みの途中で失敗（D6＝GK3 の入力）
  {
    id: 'D6',
    reason: R.writeFailed,
    now: NOW_OK,
    snapshotText: sfText(1),
    io: {
      ...realIo,
      writeFile: async (p, data) => {
        await realIo.writeFile(p, String(data).slice(0, 12)); // 半端な内容を書いてから失敗する
        throw new Error('disk full EXC-MARK-D6');
      },
    },
  },
];
