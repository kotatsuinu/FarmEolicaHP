// 出荷予報 段1：載せない一覧（H）・並び（O）・決定性（X）・警告とログ（W）
// 追補 §5：O1・O5 の区分ごとの並べ替えはファイルの形に含まれない（段2＝画面の仕事）。ここでは品目単位の並びを確かめる
import { afterAll, describe, expect, test } from 'vitest';
import { buildForecast, serializeForecast } from '../../scripts/shipment_forecast/forecast.mjs';
import { parseHiddenList } from '../../scripts/shipment_forecast/hidden_list.mjs';
import { cult, rowsOf, snap, totalOnly, variety, canon } from './helpers/builders.mjs';
import { LOG_MARKERS } from './helpers/expected.mjs';
import { STACK_LINE, findMarkers, makeFakeReader } from './helpers/fakes.mjs';
import { allSnapshot, baseSnapshot, combine, sf } from './helpers/fixtures.mjs';
import { cleanupTmp, runCase } from './helpers/harness.mjs';
import { tzTest } from './helpers/tz.mjs';

afterAll(cleanupTmp);

const thrown = (fn) => {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return undefined;
};
const crops = (forecast) => forecast.items.map((i) => i.crop);
const NOW = '2026-11-16T19:30:00Z'; // 日本時間 11/17 4:30（SF の写しを作った 30 分後）

describe('H 載せない一覧', () => {
  tzTest('H1 一覧にある作付けは外れ、理由も番号も公開ファイルに出ない', () => {
    const { forecast } = buildForecast(combine(sf(1), sf(3)), [{ cultivation_no: '209903', reason: '試験栽培のため' }]);
    expect(rowsOf(forecast)).toHaveLength(5); // SF1 の5行だけ（SF3 の3行は外れる）
    const text = serializeForecast(forecast);
    expect(text).not.toContain('試験栽培');
    expect(text).not.toContain('209903');
  });

  tzTest('H2 番号は完全一致だけ（前方一致・部分一致で他を巻き込まない）', () => {
    const s = snap([
      cult({ cultivation_no: '20990', flower_type: 'ダリア' }),
      cult({ cultivation_no: '2099030', flower_type: 'ヒマワリ' }),
      cult({ cultivation_no: '209903', flower_type: 'ストック' }),
    ]);
    const { forecast } = buildForecast(s, [{ cultivation_no: '209903', reason: 'テスト' }]);
    expect(crops(forecast).sort()).toEqual(['ダリア', 'ヒマワリ']);
  });

  tzTest('H3 番号の型が数と文字列で揺れても同じに扱う（両向き）', () => {
    const a = buildForecast(snap([cult({ cultivation_no: '209903' })]), [{ cultivation_no: 209903, reason: 'テスト' }]);
    expect(rowsOf(a.forecast)).toEqual([]);
    const b = buildForecast(snap([cult({ cultivation_no: 209903 })]), [{ cultivation_no: '209903', reason: 'テスト' }]);
    expect(rowsOf(b.forecast)).toEqual([]);
  });

  tzTest('H5 一覧が空なら全部載る（S の判定どおり）', () => {
    const { forecast } = buildForecast(baseSnapshot(), []);
    expect(rowsOf(forecast)).toHaveLength(17);
  });

  tzTest('H6 一覧の読み取り：正しい一覧は読め、壊れた一覧・番号が空欄の行は止まる', () => {
    expect(parseHiddenList('[]')).toEqual([]);
    expect(parseHiddenList('[{"cultivation_no": "209903", "reason": "試験栽培のため"}]')).toEqual([
      { cultivation_no: '209903', reason: '試験栽培のため' },
    ]);
    for (const bad of ['', '{bad', '{}', 'null', '[{"cultivation_no": ""}]', '[{"cultivation_no": null, "reason": "x"}]', '[{"reason": "x"}]', '[1]']) {
      const e = thrown(() => parseHiddenList(bad));
      expect(e, JSON.stringify(bad)).toMatchObject({ reason: 'hidden_list_invalid' });
    }
  });

  tzTest('H7 一覧の番号が実データに1件も当たらなければ警告1件・正常（打ち間違いに気づく）', () => {
    const { forecast, warnings } = buildForecast(baseSnapshot(), [{ cultivation_no: '208888', reason: 'テスト' }]);
    expect(rowsOf(forecast)).toHaveLength(17);
    expect(warnings.filter((w) => w.kind === 'hidden_no_match')).toHaveLength(1);
  });
});

describe('O 並びと決定性', () => {
  tzTest('O1 品目は、その品目の行のいちばん早い収穫開始の月の順（名前の順と逆の入力で確かめる）', () => {
    const { forecast } = buildForecast(
      snap([cult({ flower_type: 'ストック', harvest_start: '2026-12-05' }), cult({ flower_type: 'ダリア', harvest_start: '2026-11-20' })]),
      [],
    );
    expect(crops(forecast)).toEqual(['ダリア', 'ストック']);
  });

  const sameMonthPairs = [
    ['O2a', 'ストック', 'スプレーマム'], // ス＋ト／ス＋プ
    ['O2b', 'ダリア', 'トルコ桔梗'], // タ行の濁音／タ行のト
  ];
  for (const [id, first, second] of sameMonthPairs) {
    tzTest(`${id} 同じ月なら品目名の五十音順（${first} → ${second}。入力は逆順）`, () => {
      const { forecast } = buildForecast(snap([cult({ flower_type: second, harvest_start: '2026-12-05' }), cult({ flower_type: first, harvest_start: '2026-12-05' })]), []);
      expect(crops(forecast)).toEqual([first, second]);
    });
  }

  // あらすじ O2 の3組目。ICU の五十音順（localeCompare('ja')）では「ビバストック → ヒマワリ」になり、あらすじの期待と食い違う。
  // あらすじの期待（清音が先）のまま書き、食い違いは記録 §6 に残した（文字コード順なら一致）
  tzTest('O2c 同じ月なら品目名の順（ヒマワリ → ビバストック。あらすじの期待のまま・記録 §6 に食い違いの注記）', () => {
    const { forecast } = buildForecast(snap([cult({ flower_type: 'ビバストック', harvest_start: '2026-12-05' }), cult({ flower_type: 'ヒマワリ', harvest_start: '2026-12-05' })]), []);
    expect(crops(forecast)).toEqual(['ヒマワリ', 'ビバストック']);
  });

  tzTest('O3 品目の中の行は収穫開始の月の早い順、同月は品種名の五十音順、品種名なしは最後', () => {
    const z = cult({ harvest_start: '2026-12-10', planned_count_total: 600, variety_counts_usable: false, varieties: [] });
    const y = cult({ harvest_start: '2026-12-05', planned_count_total: 800, varieties: [variety('ホワイト', 400), variety('ピンク', 400)] });
    const x = cult({ harvest_start: '2026-11-25', planned_count_total: 300, varieties: [variety('ブルー', 300)] });
    const { forecast } = buildForecast(snap([z, y, x]), []);
    expect(rowsOf(forecast).map((r) => [r.harvest_from, r.variety])).toEqual([
      ['2026-11', 'ブルー'],
      ['2026-12', 'ピンク'],
      ['2026-12', 'ホワイト'],
      ['2026-12', null],
    ]);
  });

  tzTest('O4 1つの品目の行が別々の区分に分かれるときは、同じ品目の中に区分の違う行が並び、各行の区分が正しい', () => {
    const shipping = cult({ flower_type: 'ダリア', status: 'harvesting', harvest_start: '2026-10-01' });
    const later = cult({ flower_type: 'ダリア', harvest_start: '2027-02-01' });
    const { forecast } = buildForecast(snap([later, shipping]), []);
    expect(forecast.items).toHaveLength(1);
    expect(forecast.items[0].rows.map((r) => [r.harvest_from, r.section])).toEqual([
      ['2026-10', 'shipping'],
      ['2027-02', 'later'],
    ]);
  });

  tzTest('O6 出力は入力の並びに依らない（逆順・並べ替えでもバイト同一）', () => {
    const cultivations = [1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((n) => sf(n).main.cultivations);
    expect(cultivations.length).toBeGreaterThanOrEqual(12);
    const order = (idx) => ({ ...sf(1), main: { ...sf(1).main, cultivations: idx.map((i) => structuredClone(cultivations[i])) } });
    const natural = cultivations.map((_, i) => i);
    const reversed = [...natural].reverse();
    const shuffled = [...natural].sort((a, b) => ((a * 7) % 13) - ((b * 7) % 13));
    expect(shuffled).not.toEqual(natural);
    const text = (idx) => serializeForecast(buildForecast(order(idx), []).forecast);
    expect(text(reversed)).toBe(text(natural));
    expect(text(shuffled)).toBe(text(natural));
  });
});

describe('X 決定性', () => {
  tzTest('X1 同じ入力で2回流すと日時も含めてバイト同一。インデント2・LF・末尾改行1つ', () => {
    const a = serializeForecast(buildForecast(allSnapshot(), []).forecast);
    const b = serializeForecast(buildForecast(allSnapshot(), []).forecast);
    expect(b).toBe(a);
    expect(a).toBe(`${JSON.stringify(JSON.parse(a), null, 2)}\n`);
    expect(a).not.toContain('\r');
    expect(a.endsWith('}\n')).toBe(true);
  });

  tzTest('X1-実行時刻 実行時刻が違っても（36時間以内）、同じ写しなら公開ファイルはバイト同一', async () => {
    const a = await runCase({ snapshot: baseSnapshot(), now: '2026-11-16T19:30:00Z' });
    const b = await runCase({ snapshot: baseSnapshot(), now: '2026-11-17T19:30:00Z' });
    expect(a.result.exitCode).toBe(0);
    expect(a.outText).not.toBeNull();
    expect(b.outText).toBe(a.outText);
  });

  tzTest('X2 冬の0件は正常：全部 planned の写しは items が空配列で終了コード0（GV7＝作付けが0件で止まるのとは別）', async () => {
    const s = snap(
      [cult({ status: 'planned', flower_type: 'ダリア' }), cult({ status: 'planned', flower_type: 'ヒマワリ' }), cult({ status: 'planned', flower_type: 'ストック' })],
    );
    const { result, outText } = await runCase({ snapshot: s, now: '2026-11-12T19:30:00Z' });
    expect(result).toMatchObject({ exitCode: 0, reason: null });
    expect(outText).toBe('{\n  "generated_at": "2026-11-13T04:00:00+09:00",\n  "items": []\n}\n');
  });
});

describe('W 警告とログ', () => {
  tzTest('W1 食い違いは警告で残す：種類ごとに作付け番号つき。件数を数える', () => {
    const s = snap([
      cult({ cultivation_no: '209870', flower_type: 'ダリア', harvest_start: null }),
      cult({ cultivation_no: '209871', flower_type: 'ダリア', harvest_start: 'abc' }),
      cult({ cultivation_no: '209872', flower_type: 'ダリア', harvest_start: '2026-12-10', harvest_end: '2025-02-07' }),
      cult({ cultivation_no: '209873', flower_type: 'ダリア', harvest_start: '2026-12-10', harvest_end: '2026-12-09' }),
      cult({ cultivation_no: '209874', flower_type: 'ダリア', status: 'harvesting', harvest_start: '2026-09-01', harvest_end: '2026-10-31' }),
      cult({ cultivation_no: '209875', flower_type: 'ダリア', planned_count_total: 1300, varieties: [variety('ホワイト', 1100), variety('ピンク', 600)] }),
      cult({ cultivation_no: '209876', flower_type: 'ヒマワリ' }),
    ]);
    const { warnings } = buildForecast(s, []);
    const byKind = Object.fromEntries(
      [...new Set(warnings.map((w) => w.kind))].map((k) => [k, warnings.filter((w) => w.kind === k).map((w) => w.cultivation_no).sort()]),
    );
    expect(byKind).toEqual({
      harvest_start_missing: ['209870'],
      harvest_start_unreadable: ['209871'],
      harvest_end_before_start: ['209872', '209873'],
      harvest_end_past_while_harvesting: ['209874'],
      variety_total_mismatch: ['209875'],
    });
    expect(warnings).toHaveLength(6);
  });

  tzTest('W2 警告が出ても正常終了で書き出しは完了する', async () => {
    const s = combine(sf(1), sf(3), sf(4), sf(5), sf(7), sf(9));
    const { result, outText } = await runCase({ snapshot: s, now: NOW });
    expect(result.exitCode).toBe(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(outText).not.toBeNull();
  });

  tzTest('W3 実行のログ・戻り値に、写しの非公開の目印が出ない（成功の道）', async () => {
    const { result, logText } = await runCase({ snapshot: allSnapshot(), now: NOW });
    expect(result.exitCode).toBe(0);
    const everything = `${logText}\n${JSON.stringify(result)}`;
    expect(LOG_MARKERS.length).toBeGreaterThan(50);
    expect(findMarkers(everything, LOG_MARKERS.map(String))).toEqual([]);
  });

  tzTest('W3 例外の本文（目印入り）がログ・戻り値・経過の表示に出ない（読み出しが失敗する道）', async () => {
    const MARK = 'EXC-MARK-W3-9X';
    const reader = makeFakeReader({ throwError: new Error(`通信失敗 ${MARK} LOC-MARK-01`) });
    const { result, logText } = await runCase({ snapshot: sf(1), now: NOW, reader });
    expect(result).toMatchObject({ exitCode: 1, reason: 'fetch_failed' });
    const everything = `${logText}\n${JSON.stringify(result)}`;
    expect(findMarkers(everything, [MARK, 'LOC-MARK-01'])).toEqual([]);
    expect(STACK_LINE.test(everything)).toBe(false);
  });
});

// totalOnly・canon を使う小さな確かめ（見本の組み立てが効いていること）
test('H0 道具の確かめ：totalOnly は総数の1行になる入力、canon は並びを問わず比べる', () => {
  const c = totalOnly(300);
  expect(c.variety_counts_usable).toBe(false);
  expect(c.varieties).toEqual([]);
  expect(canon({ generated_at: 'x', items: [{ crop: 'b', rows: [] }, { crop: 'a', rows: [] }] }).items.map((i) => i.crop)).toEqual(['a', 'b']);
});
