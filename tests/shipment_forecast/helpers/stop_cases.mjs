// 「止まる」入力の一覧（手書き）。検査の中身は snapshot_validation.test.mjs、前の日のファイルが変わらないことは keep_previous.test.mjs（GK1）
// どちらも同じ一覧を使う。件数は STOP_CASE_COUNT・STOP_GROUP_COUNTS（手で数えた）と突き合わせる
// 「1か所だけ変えた値」には MARK を含む文字列を入れてある（読んだ値がログ・戻り値に出る実装を捕まえる）。理由の種類の判定は変えない値の形のまま
// GV5〜GV9・GF4〜GF7・GF9 は、土台を SF1（目印なし）と SF10（場所・本数・IDなどの目印入り）の両方で1通りずつ持つ
import { MISSING } from './builders.mjs';
import { sf, sfText } from './fixtures.mjs';
import { realIo } from './harness.mjs';
import { R } from './reasons.mjs';

export const NOW_OK = '2026-11-16T19:30:00Z'; // 日本時間 11/17 4:30＝写し（11/17 4:00）の30分後
// 手で数えた件数：GA 3＋GV 51（SF1土台30＋SF10土台20＋目印つきの版1）＋GF 16（SF1土台11＋SF10土台5）＋GX 3＋GU 1＋H6 3＋D6 1
export const STOP_CASE_COUNT = 78;
export const STOP_GROUP_COUNTS = { GA: 3, GV: 51, GF: 16, GX: 3, GU: 1, H6: 3, D6: 1 };

// 写し n（既定 SF1）の表紙・作付けを1か所だけ変えた文字列
function mutated(fn, n = 1) {
  const s = sf(n);
  fn(s);
  return JSON.stringify(s);
}
function setTop(key, value, n = 1) {
  return mutated((s) => {
    if (value === MISSING) delete s[key];
    else s[key] = value;
  }, n);
}
function setMain(value, n = 1) {
  return mutated((s) => {
    if (value === MISSING) delete s.main;
    else s.main = value;
  }, n);
}
function setCultivations(value, n = 1) {
  return mutated((s) => {
    if (value === MISSING) delete s.main.cultivations;
    else s.main.cultivations = value;
  }, n);
}
// 3件とも、同じ項目を変えた写し（GV8・GX）
function allChanged(field, how, n = 1) {
  return mutated((s) => {
    const base = s.main.cultivations[0];
    s.main.cultivations = [0, 1, 2].map((i) => {
      const c = structuredClone(base);
      c.cultivation_no = `20993${i}`;
      how(c, field);
      return c;
    });
  }, n);
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

// 土台（SF1・SF10）ごとに1通りずつ持つ入力：GV5〜GV9・GF4〜GF7・GF9
function perBase(n, suffix) {
  const id = (s) => `${s}${suffix}`;
  const text = () => sfText(n);
  return [
    // 形（GV5・GV6・GV7）。型が違う値に目印を入れる（文字列・オブジェクト）
    { id: id('GV5-配列'), reason: R.shapeInvalid, now: NOW_OK, snapshotText: setMain([], n) },
    { id: id('GV5-文字列'), reason: R.shapeInvalid, now: NOW_OK, snapshotText: setMain('MARK-MAIN-TEXT', n) },
    { id: id('GV5-null'), reason: R.shapeInvalid, now: NOW_OK, snapshotText: setMain(null, n) },
    { id: id('GV5-欠落'), reason: R.shapeInvalid, now: NOW_OK, snapshotText: setMain(MISSING, n) },
    { id: id('GV6-オブジェクト'), reason: R.shapeInvalid, now: NOW_OK, snapshotText: setCultivations({ note: 'MARK-CULT-OBJ' }, n) },
    { id: id('GV6-null'), reason: R.shapeInvalid, now: NOW_OK, snapshotText: setCultivations(null, n) },
    { id: id('GV6-欠落'), reason: R.shapeInvalid, now: NOW_OK, snapshotText: setCultivations(MISSING, n) },
    { id: id('GV7'), reason: R.zeroCultivations, now: NOW_OK, snapshotText: setCultivations([], n) },
    // 必須の項目が全作付けで欠落（GV8）
    { id: id('GV8-品目名'), reason: R.requiredAllMissing, now: NOW_OK, snapshotText: allChanged('flower_type', rename, n) },
    { id: id('GV8-収穫開始'), reason: R.requiredAllMissing, now: NOW_OK, snapshotText: allChanged('harvest_start', toNull, n) },
    { id: id('GV8-status'), reason: R.requiredAllMissing, now: NOW_OK, snapshotText: allChanged('status', drop, n) },
    { id: id('GV8-旗'), reason: R.requiredAllMissing, now: NOW_OK, snapshotText: allChanged('variety_counts_usable', drop, n) },
    { id: id('GV8-品種'), reason: R.requiredAllMissing, now: NOW_OK, snapshotText: allChanged('varieties', drop, n) },
    { id: id('GV8-段階'), reason: R.requiredAllMissing, now: NOW_OK, snapshotText: allChanged('current_stage', drop, n) },
    // 基準日（GV9）。読めない型のまま目印を入れる
    ...[
      ['スラッシュ', '2026/11/17 MARK-DATE'],
      ['abc', 'MARK-abc'],
      ['存在しない日', '2026-02-30'],
      ['存在しない月', '2026-13-40'],
      ['null', null],
      ['欠落', MISSING],
    ].map(([label, v]) => ({ id: id(`GV9-${label}`), reason: R.datetimeUnreadable, now: NOW_OK, snapshotText: setTop('generated_for_date', v, n) })),
    // 古さ・先の日時（GF）。写しを作った日時 2026-11-17T04:00:00+09:00＝2026-11-16T19:00:00Z
    { id: id('GF4'), reason: R.stale, now: '2026-11-18T07:00:01Z', snapshotText: text() },
    { id: id('GF5'), reason: R.stale, now: '2026-11-18T19:30:00Z', snapshotText: text() },
    { id: id('GF6'), reason: R.stale, now: '2026-11-18T10:30:00Z', snapshotText: text() },
    { id: id('GF7'), reason: R.stale, now: '2026-11-18T19:30:00Z', snapshotText: setTop('generated_at', '2026-11-17T13:00:00+09:00', n) },
    { id: id('GF9'), reason: R.future, now: '2026-11-16T18:54:59Z', snapshotText: text() },
  ];
}

const SF1_CASES = perBase(1, '');
const SF10_CASES = perBase(10, '-SF10');

export const STOP_CASES = [
  // 取得（GA）
  { id: 'GA2', reason: R.notFound, now: NOW_OK, readerOpts: { status: 404 } },
  { id: 'GA3', reason: R.forbidden, now: NOW_OK, readerOpts: { status: 403 } },
  { id: 'GA4', reason: R.fetchFailed, now: NOW_OK, readerOpts: { throwError: new Error('通信の失敗 EXC-MARK-GA4 LOC-MARK-01') } },
  // 部品の不具合：読み出し口が約束を破って null を返す（GU）
  { id: 'GU1', reason: R.unexpected, now: NOW_OK, reader: { async readObject() { return null; } } },
  // 版（GV2・GV3）
  { id: 'GV2-版2', reason: R.versionUnknown, now: NOW_OK, snapshotText: setTop('snapshot_version', 2) },
  { id: 'GV2-版0', reason: R.versionUnknown, now: NOW_OK, snapshotText: setTop('snapshot_version', 0) },
  { id: 'GV3-文字列', reason: R.versionUnknown, now: NOW_OK, snapshotText: setTop('snapshot_version', '1') },
  { id: 'GV3-目印文字列', reason: R.versionUnknown, now: NOW_OK, snapshotText: setTop('snapshot_version', 'MARK-VER') },
  { id: 'GV3-真偽', reason: R.versionUnknown, now: NOW_OK, snapshotText: setTop('snapshot_version', true) },
  { id: 'GV3-配列', reason: R.versionUnknown, now: NOW_OK, snapshotText: setTop('snapshot_version', [1]) },
  { id: 'GV3-小数', reason: R.versionUnknown, now: NOW_OK, snapshotText: setTop('snapshot_version', 1.5) },
  { id: 'GV3-null', reason: R.versionUnknown, now: NOW_OK, snapshotText: setTop('snapshot_version', null) },
  { id: 'GV3-欠落', reason: R.versionUnknown, now: NOW_OK, snapshotText: setTop('snapshot_version', MISSING) },
  // JSON（GV4）
  { id: 'GV4-途中で切れた', reason: R.jsonUnreadable, now: NOW_OK, snapshotText: trunc() },
  { id: 'GV4-空', reason: R.jsonUnreadable, now: NOW_OK, snapshotText: '' },
  // 形・必須・基準日・古さ（SF1 土台）
  ...SF1_CASES,
  // 同じ入力の SF10 土台（目印入りの場所・本数・ID を含む写し）
  ...SF10_CASES,
  // 表紙の日時が読めない（GF10）。読めない型のまま目印を入れる
  ...[
    ['空白区切り', '2026-11-17 04:00 MARK-GF10'],
    ['印なし', '2026-11-17T04:00:00'],
    ['abc', 'MARK-abc'],
    ['null', null],
    ['欠落', MISSING],
  ].map(([label, v]) => ({ id: `GF10-${label}`, reason: R.datetimeUnreadable, now: NOW_OK, snapshotText: setTop('generated_at', v) })),
  { id: 'GF11', reason: R.stale, now: '2026-11-18T11:00:00Z', snapshotText: sfText(1), readerOpts: { updated: '2026-11-18T11:00:00.000Z' } },
  // 書き出す行が0件で、不備（警告）で外れた作付けが1件以上＝正常な0件（冬）と区別して止まる（GX。理由は必須の項目が全件で欠落と同じ）
  {
    id: 'GX1-収穫開始が全件読めない',
    reason: R.requiredAllMissing,
    now: NOW_OK,
    snapshotText: allChanged('harvest_start', (c) => {
      c.harvest_start = '2026/12/10 MARK-HS';
    }),
  },
  {
    id: 'GX2-知らないstatusが全件',
    reason: R.requiredAllMissing,
    now: NOW_OK,
    snapshotText: allChanged('status', (c) => {
      c.status = 'MARK-STATUS';
    }),
  },
  { id: 'GX3-全要素がオブジェクトでない', reason: R.requiredAllMissing, now: NOW_OK, snapshotText: setCultivations([null, 'MARK-STR', 42]) },
  // 載せない一覧の異常（H6）。目印入り
  { id: 'H6-ファイルなし', reason: R.hiddenInvalid, now: NOW_OK, snapshotText: sfText(1), hiddenAbsent: true },
  { id: 'H6-壊れたJSON', reason: R.hiddenInvalid, now: NOW_OK, snapshotText: sfText(1), hidden: '{bad json MARK-H6' },
  { id: 'H6-番号が空欄', reason: R.hiddenInvalid, now: NOW_OK, snapshotText: sfText(1), hidden: '[{"cultivation_no": "", "reason": "MARK-H6-REASON"}]' },
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

// harness の runCase に渡す項目（c から必要なものだけ写す）
export const CASE_OPT_KEYS = ['readerOpts', 'reader', 'hidden', 'hiddenAbsent', 'io'];
