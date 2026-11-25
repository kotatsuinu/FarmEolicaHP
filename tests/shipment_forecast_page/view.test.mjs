// 段2 表示用の形を作る純粋な関数（view.ts）のテスト。期待値は手書き。
import { describe, test, expect } from 'vitest';
import { tzTest } from '../shipment_forecast/helpers/tz.mjs';
import { row, item, forecast, deepFreeze, GEN, NO_PHOTOS } from './helpers/builders.mjs';
import {
  parseForecast,
  formatAsOf,
  formatHarvestMonths,
  buildForecastView,
} from '../../src/lib/shipmentForecast/view.ts';

const view = (f, photos = NO_PHOTOS) => buildForecastView({ forecast: f, photos });
const sectionOf = (v, key) => v.sections.find((s) => s.key === key);
const crops = (s) => s.items.map((i) => i.crop);

describe('parseForecast（形の検査）', () => {
  test('P-1 正しい形はそのまま通る', () => {
    const f = forecast([item('トルコ桔梗', [row(), row({ variety: null, harvest_to: null, count_label: null })])]);
    expect(parseForecast(structuredClone(f))).toEqual(f);
  });

  test('P-2 知らない項目は例外にせず無視し、結果に残さない', () => {
    const raw = forecast([item('ストック', [{ ...row(), memo: 'LEAK-ROW', cultivation_no: 'LEAK-NO' }])]);
    raw.extra_top = 'LEAK-TOP';
    raw.items[0].extra_item = 'LEAK-ITEM';
    const out = parseForecast(raw);
    const text = JSON.stringify(out);
    for (const m of ['LEAK-ROW', 'LEAK-NO', 'LEAK-TOP', 'LEAK-ITEM']) expect(text).not.toContain(m);
    expect(out.items[0].rows[0].variety).toBe('テスト品種');
  });

  test.each([
    ['null', null],
    ['配列', []],
    ['文字列', 'x'],
    ['数', 1],
  ])('P-3 最上位がオブジェクトでない（%s）は例外', (_n, raw) => {
    expect(() => parseForecast(raw)).toThrow();
  });

  test.each([
    ['Z つき', '2026-11-13T04:30:00Z'],
    ['時差なし', '2026-11-13T04:30:00'],
    ['日付だけ', '2026-11-13'],
    ['秒なし', '2026-11-13T04:30+09:00'],
    ['別の時差', '2026-11-13T04:30:00+00:00'],
    ['数', 20261113],
    ['欠落', undefined],
  ])('P-4 generated_at が日本時間の日時でない（%s）は例外', (_n, g) => {
    const raw = forecast([]);
    if (g === undefined) delete raw.generated_at;
    else raw.generated_at = g;
    expect(() => parseForecast(raw)).toThrow();
  });

  test.each([
    ['欠落', undefined],
    ['null', null],
    ['オブジェクト', {}],
    ['文字列', 'x'],
  ])('P-5 items が配列でない（%s）は例外', (_n, v) => {
    const raw = { generated_at: GEN };
    if (v !== undefined) raw.items = v;
    expect(() => parseForecast(raw)).toThrow();
  });

  test('P-6 items が空配列は正常（0件）', () => {
    expect(parseForecast(forecast([]))).toEqual(forecast([]));
  });

  test.each([
    ['空文字', ''],
    ['数', 5],
    ['null', null],
    ['欠落', undefined],
  ])('P-7 品目名が空でない文字列でない（%s）は例外', (_n, v) => {
    const it = item('x', [row()]);
    if (v === undefined) delete it.crop;
    else it.crop = v;
    expect(() => parseForecast(forecast([it]))).toThrow();
  });

  test.each([
    ['欠落', undefined],
    ['空配列', []],
    ['配列でない', {}],
    ['null', null],
  ])('P-8 rows が1件以上の配列でない（%s）は例外', (_n, v) => {
    const it = { crop: 'ストック' };
    if (v !== undefined) it.rows = v;
    expect(() => parseForecast(forecast([it]))).toThrow();
  });

  test.each([
    ['日まである', '2026-11-01'],
    ['月が1桁', '2026-1'],
    ['月が00', '2026-00'],
    ['月が13', '2026-13'],
    ['数', 202611],
    ['null', null],
    ['欠落', undefined],
  ])('P-9 harvest_from が YYYY-MM でない（%s）は例外', (_n, v) => {
    const r = row();
    if (v === undefined) delete r.harvest_from;
    else r.harvest_from = v;
    expect(() => parseForecast(forecast([item('ストック', [r])]))).toThrow();
  });

  test.each([
    ['日まである', '2027-01-31'],
    ['月が00', '2027-00'],
    ['月が13', '2027-13'],
    ['数', 202701],
    ['空文字', ''],
  ])('P-10 harvest_to が YYYY-MM でも null でもない（%s）は例外', (_n, v) => {
    expect(() => parseForecast(forecast([item('ストック', [row({ harvest_to: v })])]))).toThrow();
  });

  test.each([
    ['未知の値', 'paused'],
    ['日本語', '収穫中'],
    ['大文字', 'GROWING'],
    ['null', null],
    ['欠落', undefined],
  ])('P-11 status が4種でない（%s）は例外', (_n, v) => {
    const r = row();
    if (v === undefined) delete r.status;
    else r.status = v;
    expect(() => parseForecast(forecast([item('ストック', [r])]))).toThrow();
  });

  test.each([
    ['未知の値', 'past'],
    ['null', null],
    ['欠落', undefined],
  ])('P-12 section が3種でない（%s）は例外', (_n, v) => {
    const r = row();
    if (v === undefined) delete r.section;
    else r.section = v;
    expect(() => parseForecast(forecast([item('ストック', [r])]))).toThrow();
  });

  test.each([
    ['variety が数', { variety: 5 }],
    ['count_label が数', { count_label: 1000 }],
  ])('P-13 文字列か null であるべき項目が違う型（%s）は例外', (_n, over) => {
    expect(() => parseForecast(forecast([item('ストック', [row(over)])]))).toThrow();
  });

  test('P-14 variety・count_label・harvest_to は null を許す', () => {
    const r = row({ variety: null, count_label: null, harvest_to: null });
    expect(parseForecast(forecast([item('ストック', [r])])).items[0].rows[0]).toEqual(r);
  });

  test('P-15 4つの状態と3つの区分は全部通る（通す側の相方）', () => {
    const rows = ['seedling', 'growing', 'bud', 'harvesting'].map((status) => row({ status }));
    rows.push(row({ section: 'shipping' }), row({ section: 'later' }));
    expect(parseForecast(forecast([item('ストック', rows)])).items[0].rows).toHaveLength(6);
  });
});

describe('formatAsOf（見出しの日付）', () => {
  // V7・V8：文字列から読む。時刻帯 UTC と 日本時間の両方で同じ
  const table = [
    ['2026-11-13T04:30:00+09:00', '11月13日 朝の時点'],
    ['2027-01-05T04:30:00+09:00', '1月5日 朝の時点'],
    ['2027-01-01T00:00:00+09:00', '1月1日 朝の時点'], // UTC では 2026-12-31
    ['2026-12-31T23:59:59+09:00', '12月31日 朝の時点'],
    ['2026-10-09T04:30:00+09:00', '10月9日 朝の時点'],
  ];
  for (const [input, expected] of table) {
    tzTest(`V7/V8 ${input} → ${expected}`, () => {
      expect(formatAsOf(input)).toBe(expected);
    });
  }
});

describe('formatHarvestMonths（収穫の月の表示・基準日の年つき）', () => {
  // V6 の表（手書き）
  const table = [
    ['2026-11', '2026-12', 2026, '11月〜12月'],
    ['2026-12', null, 2026, '12月から'],
    ['2026-11', '2026-11', 2026, '11月'],
    ['2026-12', '2027-01', 2026, '12月〜2027年1月'],
    ['2027-03', null, 2026, '2027年3月から'],
    ['2026-01', null, 2026, '1月から'],
    ['2027-01', '2027-02', 2026, '2027年1月〜2月'],
    ['2027-01', null, 2027, '1月から'],
    ['2027-01', '2027-01', 2026, '2027年1月'],
    ['2027-02', '2027-04', 2027, '2月〜4月'],
    ['2026-09', '2026-10', 2026, '9月〜10月'],
    // 始まりも終わりも基準の年と違い、年も違う（終わりの年を省かない）
    ['2027-12', '2028-01', 2026, '2027年12月〜2028年1月'],
    // 始まりに年が付き、終わりが始まりと違う年なら、終わりにも年を添える（「2025年12月〜2月」は
    // 2025年2月と読み違えやすいため。親の決め・2026-11-25。基準の年に年を添えないのは始まりに年が無いときだけ）
    ['2025-12', '2026-02', 2026, '2025年12月〜2026年2月'],
    // 始まりも終わりも過去の同じ年
    ['2025-11', '2025-12', 2026, '2025年11月〜12月'],
  ];
  test.each(table)('V6 %s／%s（基準 %i）→ %s', (from, to, base, expected) => {
    expect(formatHarvestMonths(from, to, base)).toBe(expected);
  });
});

describe('buildForecastView（状態）', () => {
  test('S-1 ファイル無し（null）は missing だけ', () => {
    expect(view(null)).toEqual({ state: 'missing' });
  });

  test('S-2 0件は empty（日付つき・区分なし）', () => {
    expect(view(forecast([]))).toEqual({
      state: 'empty',
      asOf: '11月13日 朝の時点',
      generatedAt: GEN,
    });
  });

  test('S-3 品目があれば present・日付と generatedAt がそのまま入る', () => {
    const v = view(forecast([item('ストック', [row()])]));
    expect(v.state).toBe('present');
    expect(v.asOf).toBe('11月13日 朝の時点');
    expect(v.generatedAt).toBe(GEN);
  });

  tzTest('V8 日付またぎ：年の基準は日本時間の年（2027）で、月の表示に出る', () => {
    const v = view(
      forecast(
        [item('ストック', [row({ harvest_from: '2027-01', harvest_to: null, section: 'soon' })])],
        '2027-01-01T00:00:00+09:00',
      ),
    );
    expect(v.asOf).toBe('1月1日 朝の時点');
    expect(v.sections[0].items[0].rows[0].months).toBe('1月から');
  });

  test('S-4 基準の年と違う年の月には年が付く（年またぎ）', () => {
    const v = view(forecast([item('ストック', [row({ harvest_from: '2026-12', harvest_to: '2027-01' })])]));
    expect(v.sections[0].items[0].rows[0].months).toBe('12月〜2027年1月');
  });
});

describe('buildForecastView（区分・並び・内容）', () => {
  const one = (section, crop, from = '2026-12') =>
    item(crop, [row({ section, harvest_from: from, harvest_to: null })]);

  test('V2/O5 区分は 出荷中→もうすぐ→これから、見出しは手書きの表どおり（入力の並びを逆にしても）', () => {
    const f = forecast([one('later', 'ダリア', '2027-03'), one('shipping', 'ストック', '2026-10'), one('soon', 'ヒマワリ')]);
    for (const input of [f, forecast([...f.items].reverse())]) {
      const v = view(input);
      expect(v.sections.map((s) => [s.key, s.title])).toEqual([
        ['shipping', '出荷中'],
        ['soon', 'もうすぐ'],
        ['later', 'これから'],
      ]);
    }
  });

  test('V3 空の区分は出ない（出荷中が無い・もうすぐが無い・これからだけ）', () => {
    const a = view(forecast([one('soon', 'ストック'), one('later', 'ダリア', '2027-03')]));
    expect(a.sections.map((s) => s.key)).toEqual(['soon', 'later']);
    const b = view(forecast([one('shipping', 'ストック', '2026-10'), one('later', 'ダリア', '2027-03')]));
    expect(b.sections.map((s) => s.key)).toEqual(['shipping', 'later']);
    const c = view(forecast([one('later', 'ダリア', '2027-03')]));
    expect(c.sections.map((s) => s.key)).toEqual(['later']);
  });

  test('O1 区分の中の品目は、その区分の行のいちばん早い収穫開始の月の順。名前の五十音順とは逆・最早は2行目にある', () => {
    // 名前順なら ストック→ダリア。最早の月順なら ダリア（最早11月・2行目）→ストック（12月）
    const A = item('ストック', [row({ harvest_from: '2026-12', variety: 'a' })]);
    const B = item('ダリア', [
      row({ harvest_from: '2026-12', variety: 'b' }),
      row({ harvest_from: '2026-11', variety: 'c' }),
    ]);
    for (const items of [[A, B], [B, A]]) {
      expect(crops(sectionOf(view(forecast(items)), 'soon'))).toEqual(['ダリア', 'ストック']);
    }
  });

  test('O1-2 ほかの区分にある行は最早に数えない（名前順・ほかの区分を数える誤りのどちらでも逆になる組）', () => {
    // アスター：出荷中に 2026-09、もうすぐに 2026-12。ダリア：もうすぐに 2026-11
    // 正しい順（もうすぐ）：ダリア（11月）→アスター（12月）。名前順ならアスターが先・他区分を数えてもアスターが先
    const X = item('アスター', [
      row({ section: 'shipping', harvest_from: '2026-09', harvest_to: null, status: 'harvesting', variety: 'x1' }),
      row({ section: 'soon', harvest_from: '2026-12', variety: 'x2' }),
    ]);
    const D = item('ダリア', [row({ section: 'soon', harvest_from: '2026-11', variety: 'd1' })]);
    for (const items of [[X, D], [D, X]]) {
      const v = view(forecast(items));
      expect(crops(sectionOf(v, 'soon'))).toEqual(['ダリア', 'アスター']);
      expect(crops(sectionOf(v, 'shipping'))).toEqual(['アスター']);
    }
  });

  test.each([
    ['ス＋ト／ス＋プ', 'スプレーマム', 'ストック', ['ストック', 'スプレーマム']],
    ['タ行の濁音／ト', 'トルコ桔梗', 'ダリア', ['ダリア', 'トルコ桔梗']],
    ['濁点はまず無視（ヒマ／ビバ）', 'ヒマワリ', 'ビバストック', ['ビバストック', 'ヒマワリ']],
  ])('O2 同じ月は品目名の五十音順（%s）', (_n, x, y, expected) => {
    for (const items of [[x, y], [y, x]]) {
      const f = forecast(items.map((c) => one('soon', c, '2026-11')));
      expect(crops(sectionOf(view(f), 'soon'))).toEqual(expected);
    }
  });

  test('O3 品目の中の行：収穫開始の月→品種名の五十音→品種名なしは同じ月の最後（月が先で、五十音は月の中だけ）', () => {
    // 早い月（11月）の行に五十音で後ろになる「ホワイト」と品種なし。12月に「イエロー」「ピンク」と品種なし
    const rows = [
      row({ variety: 'ピンク', harvest_from: '2026-12' }),
      row({ variety: null, harvest_from: '2026-12' }),
      row({ variety: 'ホワイト', harvest_from: '2026-11' }),
      row({ variety: 'イエロー', harvest_from: '2026-12' }),
      row({ variety: null, harvest_from: '2026-11' }),
    ];
    const expected = ['ホワイト', null, 'イエロー', 'ピンク', null];
    const orders = [rows, [...rows].reverse(), [rows[3], rows[4], rows[0], rows[2], rows[1]]];
    for (const order of orders) {
      const v = view(forecast([item('トルコ桔梗', order)]));
      expect(sectionOf(v, 'soon').items[0].rows.map((r) => r.variety)).toEqual(expected);
    }
  });

  test('O4 1つの品目の行が別々の区分に分かれたら、それぞれの区分にその区分の行だけで出る', () => {
    const X = item('ストック', [
      row({ section: 'later', harvest_from: '2027-03', harvest_to: null, variety: '後の品種' }),
      row({ section: 'shipping', harvest_from: '2026-09', harvest_to: '2026-12', variety: '今の品種', status: 'harvesting' }),
    ]);
    const v = view(forecast([X]));
    expect(v.sections.map((s) => s.key)).toEqual(['shipping', 'later']);
    expect(sectionOf(v, 'shipping').items.map((i) => [i.crop, i.rows.map((r) => r.variety)])).toEqual([
      ['ストック', ['今の品種']],
    ]);
    expect(sectionOf(v, 'later').items.map((i) => [i.crop, i.rows.map((r) => r.variety)])).toEqual([
      ['ストック', ['後の品種']],
    ]);
  });

  test('O6 品目・行の入力の並びを逆順・混ぜた順にしても結果が同じ（深く等しい）', () => {
    const items = [
      item('ダリア', [
        row({ variety: 'あ', harvest_from: '2026-11' }),
        row({ variety: 'い', harvest_from: '2027-03', section: 'later' }),
      ]),
      item('ストック', [row({ variety: null, harvest_from: '2026-11' }), row({ variety: 'う', harvest_from: '2026-11' })]),
      item('ヒマワリ', [row({ harvest_from: '2026-09', section: 'shipping', status: 'harvesting', harvest_to: null })]),
      item('トルコ桔梗', [row({ variety: 'え', harvest_from: '2026-12' })]),
    ];
    const base = view(forecast(items));
    expect(base.sections.map((s) => s.key)).toEqual(['shipping', 'soon', 'later']);
    const reversed = items.map((i) => ({ ...i, rows: [...i.rows].reverse() })).reverse();
    const shuffled = [items[2], items[0], items[3], items[1]];
    expect(view(forecast(reversed))).toEqual(base);
    expect(view(forecast(shuffled))).toEqual(base);
  });

  test('N-1 入力を書き換えない（凍らせた入力でも通り、同じ入力で2回呼んで同じ）', () => {
    const f = deepFreeze(
      forecast([item('ダリア', [row({ variety: 'い' }), row({ variety: 'あ' })]), item('ストック', [row()])]),
    );
    const snapshot = structuredClone(f);
    const a = view(f);
    expect(f).toEqual(snapshot);
    expect(view(f)).toEqual(a);
  });

  test('V5 状態の札は4種で別々（手書きの対応表）', () => {
    const f = forecast([
      item('ストック', [
        row({ variety: 'a', status: 'seedling', harvest_from: '2026-11' }),
        row({ variety: 'b', status: 'growing', harvest_from: '2026-11' }),
        row({ variety: 'c', status: 'bud', harvest_from: '2026-11' }),
        row({ variety: 'd', status: 'harvesting', harvest_from: '2026-11', section: 'shipping' }),
      ]),
    ]);
    const v = view(f);
    const labels = Object.fromEntries(
      v.sections.flatMap((s) => s.items.flatMap((i) => i.rows.map((r) => [r.variety, r.statusLabel]))),
    );
    expect(labels).toEqual({ a: '育苗・植え付け前', b: '生育中', c: 'つぼみ', d: '収穫中' });
  });

  test('V4 品種なし・本数なしは null のまま渡る（画面側で欄を出さない）／本数は表示文字そのまま', () => {
    const v = view(
      forecast([
        item('ストック', [
          row({ variety: null, count_label: null }),
          row({ variety: 'あ', count_label: '100本未満', harvest_from: '2027-01' }),
        ]),
      ]),
    );
    const rows = sectionOf(v, 'soon').items[0].rows;
    expect(rows[0]).toEqual({ variety: null, months: '12月〜2027年1月', statusLabel: '生育中', countLabel: null });
    expect(rows[1].countLabel).toBe('100本未満');
    expect(rows[1].variety).toBe('あ');
  });

  test('V11 問い合わせのリンクは常にちょうど /contact（品目名を渡さない）', () => {
    const names = ['カンパニュラ・メディウム', 'A&B', '空 白', '<b>'];
    const v = view(forecast(names.map((n) => item(n, [row()]))));
    const hrefs = sectionOf(v, 'soon').items.map((i) => i.contactHref);
    expect(hrefs).toHaveLength(4);
    for (const h of hrefs) expect(h).toBe('/contact');
  });

  test('V16 品目名・品種名は加工せずそのまま渡る（エスケープは描く側の仕事）', () => {
    const v = view(forecast([item('<script>x</script>&"', [row({ variety: 'A&B "q"' })])]));
    const it = sectionOf(v, 'soon').items[0];
    expect(it.crop).toBe('<script>x</script>&"');
    expect(it.rows[0].variety).toBe('A&B "q"');
  });
});

describe('buildForecastView（写真・Q9）', () => {
  const P = (name) => ({ src: `/images/forecast/${name}.jpg`, alt: `${name}の写真` });
  const photos = {
    crops: {
      ストック: { ...P('stock'), varieties: { ホワイト: P('stock-white'), ピンク: P('stock-pink') } },
      ダリア: P('dahlia'),
    },
  };
  const photoOf = (f) => sectionOf(view(f, photos), 'soon').items[0].photo;

  test('Q9-1 行がすべて同じ1つの品種で、その品種の写真があれば品種の写真', () => {
    const f = forecast([
      item('ストック', [row({ variety: 'ホワイト' }), row({ variety: 'ホワイト', harvest_from: '2027-01' })]),
    ]);
    expect(photoOf(f)).toEqual(P('stock-white'));
  });

  test('Q9-2 品種の写真が表に無い品種なら品目の写真', () => {
    expect(photoOf(forecast([item('ストック', [row({ variety: 'イエロー' })])]))).toEqual(P('stock'));
  });

  test('Q9-3 品種が複数（どちらも写真あり）なら品目の写真', () => {
    const f = forecast([item('ストック', [row({ variety: 'ホワイト' }), row({ variety: 'ピンク' })])]);
    expect(photoOf(f)).toEqual(P('stock'));
  });

  test('Q9-4 品種名なしの行が混じる／全部品種名なしなら品目の写真', () => {
    expect(photoOf(forecast([item('ストック', [row({ variety: 'ホワイト' }), row({ variety: null })])]))).toEqual(P('stock'));
    expect(photoOf(forecast([item('ストック', [row({ variety: null })])]))).toEqual(P('stock'));
  });

  test('Q9-5 品種の表が無い品目は品目の写真。写真の無い品目は null', () => {
    expect(photoOf(forecast([item('ダリア', [row({ variety: 'あ' })])]))).toEqual(P('dahlia'));
    expect(photoOf(forecast([item('ヒマワリ', [row()])]))).toBeNull();
    expect(sectionOf(view(forecast([item('ヒマワリ', [row()])]), { crops: {} }), 'soon').items[0].photo).toBeNull();
  });

  test('Q9-6 「表示する区分のまとまりの行」で判定する：区分ごとに別々に決まる', () => {
    const X = item('ストック', [
      row({ section: 'shipping', variety: 'ホワイト', status: 'harvesting', harvest_from: '2026-09' }),
      row({ section: 'later', variety: 'イエロー', harvest_from: '2027-03', harvest_to: null }),
    ]);
    const v = view(forecast([X]), photos);
    expect(sectionOf(v, 'shipping').items[0].photo).toEqual(P('stock-white'));
    expect(sectionOf(v, 'later').items[0].photo).toEqual(P('stock'));
  });

  test('Q9-7 写真は {src, alt} だけ（表の余計な項目を出さない）', () => {
    const p = photoOf(forecast([item('ストック', [row({ variety: 'ホワイト' })])]));
    expect(Object.keys(p).sort()).toEqual(['alt', 'src']);
  });
});
