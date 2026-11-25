// 出荷予報 段1：行のつくり方と本数の丸め（あらすじ §6.6 N・§6.7 R・追補 §6.8 GN）
// 品種名の取り方の順・品種ごとの本数が使えるかの判定は写しの側で済んでいる。HP は variety_counts_usable（旗）に従う
import { describe, expect, test } from 'vitest';
import { buildForecast } from '../../scripts/shipment_forecast/forecast.mjs';
import { MISSING, cult, rowsOf, snap, totalOnly, variety } from './helpers/builders.mjs';
import { ROUND_TABLE } from './helpers/expected.mjs';
import { tzTest } from './helpers/tz.mjs';

function run(cultivations, over = {}) {
  const { forecast, warnings } = buildForecast(snap(cultivations, over), []);
  return { forecast, warnings, rows: rowsOf(forecast) };
}
const pairs = (rows) => rows.map((r) => [r.variety, r.count_label]);
const kindCount = (warnings, kind) => warnings.filter((w) => w.kind === kind).length;

describe('N 行のつくり方', () => {
  tzTest('N1 品種ごとに1行（本数 700×4・1,300）', () => {
    const c = cult({
      planned_count_total: 4100,
      varieties: [
        variety('ラベンダー', 1300), variety('ホワイト', 700), variety('ブルー', 700), variety('ピンク', 700), variety('グリーン', 700),
      ],
    });
    expect(pairs(run([c]).rows)).toEqual([
      ['グリーン', '約700本'], ['ピンク', '約700本'], ['ブルー', '約700本'], ['ホワイト', '約700本'], ['ラベンダー', '約1千本'],
    ]);
  });

  tzTest('N3 品種名がどこにも無ければ品種名なし（総数あり）', () => {
    const { rows } = run([totalOnly(1200)]);
    expect(pairs(rows)).toEqual([[null, '約1千本']]);
  });

  tzTest('N4 一部の品種だけ本数があれば、本数のある行と本数なしの行（名前順）', () => {
    const c = cult({
      planned_count_total: 4000,
      varieties: [variety('ホワイト', 1600), variety('ピンク', null), variety('イエロー', 1600), variety('ブルー', null)],
    });
    expect(pairs(run([c]).rows)).toEqual([['イエロー', '約2千本'], ['ピンク', null], ['ブルー', null], ['ホワイト', '約2千本']]);
  });

  tzTest('N5 品種の合計と総数が合わなければ品種ごとの値を使い、警告1件（数字は書かない）', () => {
    const c = cult({
      cultivation_no: '209860',
      planned_count_total: 1300,
      varieties: [variety('ホワイト', 1100), variety('ピンク', 600), variety('ブルー', 900)],
    });
    const { rows, warnings } = run([c]);
    expect(pairs(rows)).toEqual([['ピンク', '約600本'], ['ブルー', '約900本'], ['ホワイト', '約1千本']]);
    const w = warnings.filter((x) => x.kind === 'variety_total_mismatch');
    expect(w).toEqual([expect.objectContaining({ cultivation_no: '209860' })]);
    const text = JSON.stringify(warnings);
    for (const n of ['1300', '1100', '600', '900']) expect(text).not.toContain(n);
  });

  tzTest('N6 本数がどこにも無い・0 なら行は出て本数を出さない', () => {
    for (const total of [null, 0, MISSING]) {
      const { rows } = run([totalOnly(total)]);
      expect(pairs(rows), String(total)).toEqual([[null, null]]);
    }
  });

  tzTest('N7 品種の planned_count が 0 の行は他に本数があれば本数なし', () => {
    const c = cult({ planned_count_total: 800, varieties: [variety('ベータ', 0), variety('アルファ', 800)] });
    expect(pairs(run([c]).rows)).toEqual([['アルファ', '約800本'], ['ベータ', null]]);
  });

  tzTest('N8 使うのは planned_count だけ（実績などの項目は使わない）', () => {
    const c = cult({ actual_count: 300, varieties: [variety('ホワイト', 800, { actual_count: 300 })] });
    expect(pairs(run([c]).rows)).toEqual([['ホワイト', '約800本']]);
  });

  tzTest('N9 同じ品目・同じ品種でも作付けが違えば別の行（統合しない）', () => {
    const a = cult({ harvest_start: '2026-12-10', varieties: [variety('ホワイト', 800)] });
    const b = cult({ harvest_start: '2027-01-10', varieties: [variety('ホワイト', 800)] });
    const { forecast, rows } = run([a, b]);
    expect(forecast.items).toHaveLength(1);
    expect(rows.map((r) => r.harvest_from)).toEqual(['2026-12', '2027-01']);
  });

  tzTest('N10 本数が数として読めない・負は本数なし＋警告、小数はそのまま丸め規則へ', () => {
    const c = cult({
      cultivation_no: '209861',
      planned_count_total: 1000,
      varieties: [variety('ベータ', 300), variety('アルファ', '800'), variety('ガンマ', -5), variety('デルタ', 12.5)],
    });
    const { rows, warnings } = run([c]);
    expect(pairs(rows)).toEqual([['アルファ', null], ['ガンマ', null], ['デルタ', '100本未満'], ['ベータ', '約300本']]);
    expect(kindCount(warnings, 'count_unreadable')).toBe(2);
  });

  tzTest('N16 品種ごとの本数が全部 0（旗は false）なら総数の1行：品種名は配列の順に「・」でつなぐ', () => {
    const c = totalOnly(1830, { varieties: [variety('レッド', 0), variety('ピンク', 0), variety('ホワイト', 0)] });
    expect(pairs(run([c]).rows)).toEqual([['レッド・ピンク・ホワイト', '約2千本']]);
    // 総数も 0 なら本数なしの1行
    const z = totalOnly(0, { varieties: [variety('レッド', 0), variety('ピンク', 0)] });
    expect(pairs(run([z]).rows)).toEqual([['レッド・ピンク', null]]);
  });
});

describe('GN 本数の行（写しの旗 variety_counts_usable に従う）', () => {
  tzTest('GN1 旗が false なら総数の1行：品種名は2つを「・」でつなぐ・約2千本', () => {
    const c = totalOnly(1830, { varieties: [variety('ブルー', null), variety('ホワイト', null)] });
    expect(pairs(run([c]).rows)).toEqual([['ブルー・ホワイト', '約2千本']]);
  });

  tzTest('GN2 旗が true なら品種ごとの行（800／0／null）', () => {
    const c = cult({ planned_count_total: 800, varieties: [variety('ベータ', 0), variety('アルファ', 800), variety('ガンマ', null)] });
    expect(pairs(run([c]).rows)).toEqual([['アルファ', '約800本'], ['ガンマ', null], ['ベータ', null]]);
  });

  tzTest('GN3 旗が false なのに品種の1つが 500：旗に従って総数の1行＋警告1件（作付け番号つき・本数は出さない）', () => {
    const c = totalOnly(1830, {
      cultivation_no: '209862',
      varieties: [variety('アルファ', 500), variety('ベータ', null)],
    });
    const { rows, warnings } = run([c]);
    expect(pairs(rows)).toEqual([['アルファ・ベータ', '約2千本']]);
    const w = warnings.filter((x) => x.kind === 'flag_mismatch');
    expect(w).toEqual([expect.objectContaining({ cultivation_no: '209862' })]);
    expect(JSON.stringify(warnings)).not.toContain('500');
  });

  tzTest('GN3b 旗が true なのに品種の本数が全部 0／null：品種ごとの行（本数なし）＋警告1件', () => {
    const c = cult({
      cultivation_no: '209863',
      variety_counts_usable: true,
      planned_count_total: 1830,
      varieties: [variety('アルファ', 0), variety('ベータ', null)],
    });
    const { rows, warnings } = run([c]);
    expect(pairs(rows)).toEqual([['アルファ', null], ['ベータ', null]]);
    expect(warnings.filter((x) => x.kind === 'flag_mismatch')).toEqual([expect.objectContaining({ cultivation_no: '209863' })]);
  });

  tzTest('GN4 品種名が null の品種は品種名なし（行は出る・約300本）', () => {
    const c = cult({ planned_count_total: 300, varieties: [variety(null, 300)] });
    expect(pairs(run([c]).rows)).toEqual([[null, '約300本']]);
  });

  tzTest('GN5 「シリーズ」で終わる名前は HP 側で除く（総数の行）。途中に含むだけの名前は除かない。全部除けば品種名なし', () => {
    const a = totalOnly(1830, { varieties: [variety('カルテットシリーズ', null), variety('ホワイト', null)] });
    expect(pairs(run([a]).rows)).toEqual([['ホワイト', '約2千本']]);
    const b = totalOnly(1830, { varieties: [variety('シリーズホワイト', null), variety('レッド', null)] });
    expect(pairs(run([b]).rows)).toEqual([['シリーズホワイト・レッド', '約2千本']]);
    const c = totalOnly(1830, { varieties: [variety('カルテットシリーズ', null)] });
    expect(pairs(run([c]).rows)).toEqual([[null, '約2千本']]);
  });

  tzTest('GN5b 品種ごとの行でも「シリーズ」で終わる品種は行ごと除く', () => {
    const c = cult({ planned_count_total: 700, varieties: [variety('カルテットシリーズ', 400), variety('ホワイト', 300)] });
    expect(pairs(run([c]).rows)).toEqual([['ホワイト', '約300本']]);
  });
});

describe('R 本数の丸め（設計 §5.3 の表を手で起こした）', () => {
  for (const [n, label] of ROUND_TABLE) {
    tzTest(`R-${n} ${n}本 → ${label}`, () => {
      const { rows } = run([totalOnly(n)]);
      expect(rows).toHaveLength(1);
      expect(rows[0].count_label).toBe(label);
    });
  }

  tzTest('R-0 0・null・欠落は本数を出さない', () => {
    for (const total of [0, null, MISSING]) expect(run([totalOnly(total)]).rows[0].count_label, String(total)).toBeNull();
  });

  tzTest('R-品種 品種ごとの行にも同じ規則（境目の両側）', () => {
    const counts = { ア: 949, イ: 950, ウ: 1499, エ: 1500, オ: 9499, カ: 9500 };
    const c = cult({ planned_count_total: 1, varieties: Object.entries(counts).map(([name, n]) => variety(name, n)) });
    expect(pairs(run([c]).rows)).toEqual([
      ['ア', '約900本'], ['イ', '約1千本'], ['ウ', '約1千本'], ['エ', '約2千本'], ['オ', '約9千本'], ['カ', '約1万本'],
    ]);
  });

  tzTest('R-行ごと 丸めは1行ごと（総数と品種の合計を足して丸めない）', () => {
    // 品種 949＋949＝1,898（足して丸めると約2千本）。1行ごとなら約900本が2行
    const c = cult({ planned_count_total: 1898, varieties: [variety('アルファ', 949), variety('ベータ', 949)] });
    expect(pairs(run([c]).rows)).toEqual([['アルファ', '約900本'], ['ベータ', '約900本']]);
  });

  test('R-表 手書きの丸めの表は境目の両側を持つ（表の確かめ）', () => {
    const has = (n) => ROUND_TABLE.some(([v]) => v === n);
    for (const [a, b] of [[99, 100], [149, 150], [949, 950], [999, 1000], [1499, 1500], [9499, 9500], [10499, 10500]]) {
      expect(has(a) && has(b), `${a}/${b}`).toBe(true);
    }
  });
});
