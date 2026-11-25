// 出荷予報 段1：公開ファイルに出してよいものだけが出る（あらすじ §6.1 P・追補 §6.9 GP）
// 実装前は部品が未実装なので、buildForecast を呼ぶテストは赤になるのが正しい（P10・GP2・P11 は検査器そのものの確かめなので緑）
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { buildForecast, serializeForecast } from '../../scripts/shipment_forecast/forecast.mjs';
import { cult, rowsOf, snap, totalOnly, variety, canon, resetSeq } from './helpers/builders.mjs';
import {
  checkP1, checkP2, checkP3, checkP4, checkP5, checkP6, checkP8, scanFixtureText, getPath,
} from './helpers/checks.mjs';
import {
  ALL_CROPS, ALL_VARIETIES, BASE_EXPECTED, BASE_ROW_COUNT, NON_PUBLIC, NON_PUBLIC_COUNT, STRING_MARKER_COUNT,
} from './helpers/expected.mjs';
import { FIXTURE_DIR, allSnapshot, baseSnapshot, sf, sfText } from './helpers/fixtures.mjs';
import { tzTest } from './helpers/tz.mjs';

const ALL_ROW_COUNT = 24; // 手で数えた：SF1〜SF6 の 17 行＋SF7 の 2 行＋SF8 の 2 行＋SF10 の 3 行（SF9 は 0 行）

function build(snapshot, hidden = []) {
  const { forecast, warnings } = buildForecast(snapshot, hidden);
  return { forecast, warnings, text: serializeForecast(forecast) };
}
const NOTE = 'NOTE-MARK-X';

describe('P 公開してはいけない項目が混ざらない', () => {
  tzTest('P1 許可した項目名以外が1つも無い（SF1〜SF10 全部）', () => {
    const { forecast } = build(allSnapshot());
    expect(rowsOf(forecast).length).toBeGreaterThan(0);
    expect(checkP1(forecast)).toEqual([]);
  });

  tzTest('P2 数の型の値が1つも出ない', () => {
    const { forecast } = build(allSnapshot());
    expect(checkP2(forecast)).toEqual([]);
  });

  tzTest('P3 作付け番号・場所・ベッド・段階名・各ID の目印が文字として出ない', () => {
    const { text } = build(allSnapshot());
    const markers = Object.entries(NON_PUBLIC)
      .filter(([p]) => /cultivation_no|location|bed_numbers|stage_name|stage_id|variety_id/.test(p))
      .map(([, v]) => v);
    expect(markers.length).toBeGreaterThan(10);
    expect(checkP3(text, markers)).toEqual([]);
  });

  tzTest('P4 生の本数は count_label 以外のどこにも出ず、count_label は許される形', () => {
    const snapshot = allSnapshot();
    const raw = new Set();
    for (const c of snapshot.main.cultivations) {
      if (typeof c.planned_count_total === 'number') raw.add(c.planned_count_total);
      for (const v of c.varieties) if (typeof v.planned_count === 'number') raw.add(v.planned_count);
    }
    expect(raw.size).toBeGreaterThan(8);
    const { forecast } = build(snapshot);
    expect(checkP4(forecast, [...raw])).toEqual([]);
  });

  tzTest('P5 日単位の日付が出ない（月は YYYY-MM）', () => {
    const { forecast } = build(allSnapshot());
    expect(checkP5(forecast)).toEqual([]);
  });

  tzTest('P6 6桁の作付け番号の形が出ない', () => {
    const { text } = build(allSnapshot());
    expect(checkP6(text)).toEqual([]);
  });

  tzTest('P7 元データに新しい項目が増えても自動では出ない', () => {
    const before = build(sf(1));
    const s = sf(1);
    s.new_top_field = NOTE;
    s.main.cultivations[0].new_internal_note = NOTE;
    s.main.cultivations[0].varieties[0].new_variety_note = NOTE;
    const after = build(s);
    expect(after.text).toBe(before.text);
    expect(after.text).not.toContain(NOTE);
  });

  tzTest('P8 値まで設計書 §6.2 のとおり（手書きの名前の集合に含まれる）', () => {
    const { forecast } = build(allSnapshot());
    expect(checkP8(forecast, { crops: ALL_CROPS, varieties: ALL_VARIETIES })).toEqual([]);
  });

  tzTest('P9 検査が空振りしない：行の件数が手書きの期待と一致し、SF1〜SF6 の中身が期待どおり', () => {
    const base = build(baseSnapshot()).forecast;
    expect(rowsOf(base)).toHaveLength(BASE_ROW_COUNT);
    expect(canon(base)).toEqual(canon(BASE_EXPECTED));
    const all = build(allSnapshot()).forecast;
    expect(rowsOf(all)).toHaveLength(ALL_ROW_COUNT);
  });

  // 検査器そのものが効く（実装に依らない。実装前から緑）
  test('P10 陽性コントロール：禁止項目を混ぜた偽の出力を、各検査が1つずつ赤にする', () => {
    const good = {
      generated_at: '2026-11-17T04:00:00+09:00',
      items: [
        {
          crop: 'ストック',
          rows: [{ variety: 'ホワイト', harvest_from: '2026-12', harvest_to: null, status: 'growing', section: 'soon', count_label: '約800本' }],
        },
      ],
    };
    const text = (f) => JSON.stringify(f);
    const withRow = (patch) => {
      const f = structuredClone(good);
      Object.assign(f.items[0].rows[0], patch);
      return f;
    };
    const sets = { crops: new Set(['ストック']), varieties: new Set(['ホワイト']) };
    // 正常な出力は全部の検査を通る（検査器が何でも赤にしていない）
    expect(checkP1(good)).toEqual([]);
    expect(checkP2(good)).toEqual([]);
    expect(checkP3(text(good), ['LOC-MARK-01'])).toEqual([]);
    expect(checkP4(good, [800])).toEqual([]);
    expect(checkP5(good)).toEqual([]);
    expect(checkP6(text(good))).toEqual([]);
    expect(checkP8(good, sets)).toEqual([]);
    // 1つずつ混ぜる
    expect(checkP1(withRow({ new_key: 'x' }))).toContain('extra_key:new_key@row');
    expect(checkP2(withRow({ count_label: 800 }))).toContain('number@$.items[0].rows[0].count_label');
    expect(checkP3(text(withRow({ variety: 'LOC-MARK-01' })), ['LOC-MARK-01'])).toContain('marker:LOC-MARK-01');
    expect(checkP5(withRow({ harvest_from: '2026-12-10' }))).toContain('day_date:2026-12-10@$.items[0].rows[0].harvest_from');
    expect(checkP6(text(withRow({ variety: '209901' })))).toContain('cultivation_no_shape:209901');
    expect(checkP4(withRow({ variety: '800' }), [800])).toContain('raw_count:800@variety');
    const badCrop = structuredClone(good);
    badCrop.items[0].crop = '入力に無い品目';
    expect(checkP8(badCrop, sets)).toContain('crop:入力に無い品目');
    expect(checkP8(withRow({ status: 'blooming' }), sets)).toContain('status:blooming');
    expect(checkP4(withRow({ count_label: '約800' }), [800])).toContain('bad_count_label:約800');
    expect(checkP8(withRow({ count_label: '約800' }), sets)).toContain('count_label:約800');
  });

  test('P11 テスト用データに実在しうる作付け番号・利用者IDらしき文字列・鍵らしき文字列が無い（公開リポジトリ）', () => {
    const files = fs.readdirSync(FIXTURE_DIR).filter((f) => f.endsWith('.json'));
    expect(files.length).toBeGreaterThanOrEqual(11); // 対象0件で緑にしない（SF1〜SF10＋前日の公開ファイル）
    for (const f of files) {
      expect(scanFixtureText(fs.readFileSync(path.join(FIXTURE_DIR, f), 'utf8')), f).toEqual([]);
    }
    // 陽性の確かめ：実在しうる番号を1つ混ぜた版・各種の目印で赤になる
    expect(scanFixtureText(sfText(1).replace('209901', '202609'))).toContain('real_looking_no:202609');
    expect(scanFixtureText('{"cultivation_no": "209901"}')).toEqual([]);
    expect(scanFixtureText('{"uid": "abcdefghijklmnopqrstuvwxyz12"}')).toContain('user_id_like:abcdefghijklmnopqrstuvwxyz12');
    for (const w of ['private_key', 'BEGIN PRIVATE KEY', 'client_email', 'iam.gserviceaccount.com']) {
      expect(scanFixtureText(`x ${w} x`)).toContain(`key_like:${w}`);
    }
    expect(scanFixtureText('AIzaSyA1234567890abcdefg')).toContain('key_like:AIzaSyA1234567890abcdefg');
  });
});

describe('GP 写しにだけある項目が出ない', () => {
  test('GP1-見本 SF10 の目印が手書きの表どおり入っている（検査した目印の数＝入れた目印の数）', () => {
    const s = sf(10);
    const entries = Object.entries(NON_PUBLIC);
    expect(entries).toHaveLength(NON_PUBLIC_COUNT);
    expect(new Set(entries.map(([, v]) => v)).size).toBe(NON_PUBLIC_COUNT); // 全部ちがう値
    for (const [p, v] of entries) expect(getPath(s, p), p).toBe(v);
    const tokens = new Set(sfText(10).match(/[A-Z]+-MARK-[0-9A-Z]+/g));
    expect(tokens.size).toBe(STRING_MARKER_COUNT); // 表に無い目印が見本に紛れていない
    for (const t of tokens) expect(Object.values(NON_PUBLIC)).toContain(t);
  });

  tzTest('GP1 写しにだけある非公開の項目の目印が、出力の全文に1つも出ない', () => {
    const { text } = build(allSnapshot());
    const markers = Object.values(NON_PUBLIC).map(String);
    expect(markers).toHaveLength(NON_PUBLIC_COUNT);
    expect(checkP3(text, markers)).toEqual([]);
    // SF10 の公開に使う項目（品目・品種・月）は出ている＝空の出力で緑にならない
    expect(text).toContain('キンギョソウ');
    expect(text).toContain('2027-02');
  });

  test('GP2 検査器が効く：目印を1つずつ混ぜた偽の出力を全部検出する', () => {
    const baseText = JSON.stringify(BASE_EXPECTED, null, 2); // 検査器だけの確かめ（実装の書き出しを使わない）
    for (const m of Object.values(NON_PUBLIC).map(String)) {
      expect(checkP3(`${baseText}${m}`, [m]), m).toEqual([`marker:${m}`]);
    }
  });

  tzTest('GP3 生の本数が出ない：丸めで消える端数（1827）の並びが0件・数値型0個', () => {
    for (const c of [totalOnly(1827), cult({ planned_count_total: 1827, varieties: [variety('ホワイト', 1827)] })]) {
      resetSeq();
      const { forecast, text } = build(snap([c]));
      expect(rowsOf(forecast)).toHaveLength(1);
      expect(rowsOf(forecast)[0].count_label).toBe('約2千本');
      expect(text).not.toContain('1827');
      expect(checkP2(forecast)).toEqual([]);
    }
  });
});
