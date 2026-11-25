// 出荷予報 段1：載せる／外す（あらすじ §6.2 S・T2・追補 §6.3 GC・§6.7 GB1・GB6）
// 基準日は写しの generated_for_date（特に断りが無ければ 2026-11-13）。判定は buildForecast（時計を見ない）
import { describe, expect, test } from 'vitest';
import { buildForecast } from '../../scripts/shipment_forecast/forecast.mjs';
import { MISSING, canon, cult, rowsOf, snap } from './helpers/builders.mjs';
import { baseSnapshot, sf } from './helpers/fixtures.mjs';
import { tzTest } from './helpers/tz.mjs';

function run(cultivations, over = {}, hidden = []) {
  return buildForecast(snap(cultivations, over), hidden);
}
const hasWarning = (warnings, kind, no) =>
  warnings.some((w) => w.kind === kind && (no === undefined || w.cultivation_no === no));
const crops = (forecast) => forecast.items.map((i) => i.crop);

describe('S 載せる／外す', () => {
  tzTest('S1 収穫開始が日付で読め、終わっていない作付けは載る', () => {
    const { forecast } = run([cult({ harvest_start: '2026-12-10' })]);
    const rows = rowsOf(forecast);
    expect(rows).toHaveLength(1);
    expect(rows[0].harvest_from).toBe('2026-12');
  });

  tzTest('S2 completed／deleted／「完了」は外し、想定外の値として警告（写しには入らない値）', () => {
    for (const status of ['completed', 'deleted', '完了']) {
      const c = cult({ status, cultivation_no: '209850' });
      const { forecast, warnings } = run([c, cult({ flower_type: 'ダリア' })]);
      expect(crops(forecast), status).toEqual(['ダリア']);
      expect(warnings.filter((w) => w.kind === 'status_unexpected'), status).toEqual([
        expect.objectContaining({ kind: 'status_unexpected', cultivation_no: '209850' }),
      ]);
    }
  });

  tzTest('S3 収穫開始が null／空文字／欠落なら外し、作付け番号つきで警告。他の作付けは止まらない', () => {
    for (const hs of [null, '', MISSING]) {
      const { forecast, warnings } = run([cult({ harvest_start: hs, cultivation_no: '209851' }), cult({ flower_type: 'ダリア' })]);
      expect(crops(forecast)).toEqual(['ダリア']);
      expect(hasWarning(warnings, 'harvest_start_missing', '209851')).toBe(true);
    }
  });

  tzTest('S4 収穫開始の形が壊れていても落ちずに外し、警告。他の作付けの書き出しは止まらない', () => {
    for (const hs of ['2026/12/10', 'abc', '2026-13-40', '2026-02-30']) {
      const { forecast, warnings } = run([cult({ harvest_start: hs, cultivation_no: '209852' }), cult({ flower_type: 'ダリア' })]);
      expect(crops(forecast), hs).toEqual(['ダリア']);
      expect(hasWarning(warnings, 'harvest_start_unreadable', '209852'), hs).toBe(true);
    }
  });

  tzTest('S5 終わりが始まりより前なら終わりの月なしで載せ、警告（過去の月でも外れない）', () => {
    const { forecast, warnings } = run([cult({ harvest_start: '2026-12-10', harvest_end: '2025-02-07', cultivation_no: '209853' })]);
    const rows = rowsOf(forecast);
    expect(rows).toHaveLength(1);
    expect(rows[0].harvest_to).toBeNull();
    expect(hasWarning(warnings, 'harvest_end_before_start', '209853')).toBe(true);
  });

  tzTest('S6 終わり＝始まりは壊れていない（境目の相方）', () => {
    const { forecast, warnings } = run([cult({ harvest_start: '2026-12-10', harvest_end: '2026-12-10' })]);
    expect(rowsOf(forecast)[0].harvest_to).toBe('2026-12');
    expect(warnings.filter((w) => w.kind === 'harvest_end_before_start')).toEqual([]);
  });

  tzTest('S7 終わりが始まりの1日前は壊れている（境目）', () => {
    const { forecast, warnings } = run([cult({ harvest_start: '2026-12-10', harvest_end: '2026-12-09', cultivation_no: '209854' })]);
    expect(rowsOf(forecast)[0].harvest_to).toBeNull();
    expect(hasWarning(warnings, 'harvest_end_before_start', '209854')).toBe(true);
  });

  tzTest('S8 終わりの月が今月なら載る（月初・月末）', () => {
    for (const end of ['2026-11-01', '2026-11-30']) {
      const { forecast } = run([cult({ harvest_start: '2026-10-15', harvest_end: end })]);
      const rows = rowsOf(forecast);
      expect(rows, end).toHaveLength(1);
      expect(rows[0].harvest_to, end).toBe('2026-11');
    }
  });

  tzTest('S9 終わりの月が先月（月末）で収穫中でなければ外す', () => {
    const { forecast } = run([cult({ harvest_start: '2026-09-01', harvest_end: '2026-10-31', status: 'active' })]);
    expect(rowsOf(forecast)).toEqual([]);
  });

  tzTest('S10 終わりの月が先月でも収穫中なら載せ、終わりの月は出さず、警告', () => {
    const { forecast, warnings } = run([
      cult({ harvest_start: '2026-09-01', harvest_end: '2026-10-31', status: 'harvesting', cultivation_no: '209855' }),
    ]);
    const rows = rowsOf(forecast);
    expect(rows).toHaveLength(1);
    expect(rows[0].harvest_to).toBeNull();
    expect(rows[0].section).toBe('shipping');
    expect(hasWarning(warnings, 'harvest_end_past_while_harvesting', '209855')).toBe(true);
  });

  tzTest('S11 年またぎでも「先月」を正しく数える（基準日 2027-01-10）', () => {
    const over = { generated_at: '2027-01-10T04:00:00+09:00', generated_for_date: '2027-01-10' };
    const out = run([cult({ flower_type: 'ダリア', harvest_start: '2026-10-01', harvest_end: '2026-12-31' })], over);
    expect(rowsOf(out.forecast)).toEqual([]);
    const inn = run([cult({ flower_type: 'ダリア', harvest_start: '2026-10-01', harvest_end: '2027-01-01' })], over);
    expect(rowsOf(inn.forecast)).toHaveLength(1);
    expect(rowsOf(inn.forecast)[0].harvest_to).toBe('2027-01');
  });

  tzTest('S12 終わりが空文字・null・欠落なら終わりの月なし（警告は出さない）', () => {
    for (const he of ['', null, MISSING]) {
      const { forecast, warnings } = run([cult({ harvest_end: he })]);
      expect(rowsOf(forecast)).toHaveLength(1);
      expect(rowsOf(forecast)[0].harvest_to).toBeNull();
      expect(warnings).toEqual([]);
    }
  });

  tzTest('S13 旧方式の is_visible を見ない', () => {
    const shown = run([cult({ is_visible: false, status: 'active' })]);
    expect(rowsOf(shown.forecast)).toHaveLength(1);
    const hidden = run([cult({ is_visible: true, status: 'completed' })]);
    expect(rowsOf(hidden.forecast)).toEqual([]);
  });

  tzTest('S14 古い開始日でも今収穫中なら載る（2026-02-26 以降の絞り込みを持ち込まない）', () => {
    const { forecast } = run([
      cult({ start_date: '2025-03-01', actual_planting_date: '2025-04-01', status: 'harvesting', harvest_start: '2026-10-20' }),
    ]);
    expect(rowsOf(forecast)).toHaveLength(1);
    expect(rowsOf(forecast)[0].status).toBe('harvesting');
  });

  tzTest('S16 品目名が空・null・欠落の作付けは外して警告（品目名の無い行を出さない）', () => {
    for (const ft of ['', null, MISSING]) {
      const { forecast, warnings } = run([cult({ flower_type: ft, cultivation_no: '209856' }), cult({ flower_type: 'ダリア' })]);
      expect(crops(forecast)).toEqual(['ダリア']);
      expect(hasWarning(warnings, 'crop_missing', '209856')).toBe(true);
    }
  });

  tzTest('S17 作付けを始めていない（planned）作付けは外す。警告は出さない（正常な絞り込み）', () => {
    for (const status_source of ['stored', 'inferred', 'legacy_normalized']) {
      const { forecast, warnings } = run([cult({ status: 'planned', status_source, flower_type: 'ダリア' })]);
      expect(rowsOf(forecast), status_source).toEqual([]);
      expect(warnings, status_source).toEqual([]);
    }
    // 相方：同じ日付の active は載る（S1）
    expect(rowsOf(run([cult({ status: 'active', flower_type: 'ダリア' })]).forecast)).toHaveLength(1);
  });

  tzTest('T2 想定外の status（休止など）は公開しない側に倒して外し、警告', () => {
    const { forecast, warnings } = run([cult({ status: '休止', cultivation_no: '209857' }), cult({ flower_type: 'ダリア' })]);
    expect(crops(forecast)).toEqual(['ダリア']);
    expect(hasWarning(warnings, 'status_unexpected', '209857')).toBe(true);
  });
});

describe('GC 作付け1件だけの不備は、その作付けだけ外す', () => {
  const baseCultivations = () => [sf(1).main.cultivations[0], sf(3).main.cultivations[0]];
  const baseline = () => canon(buildForecast(snap(baseCultivations(), { generated_at: '2026-11-17T04:00:00+09:00', generated_for_date: '2026-11-17' }), []).forecast);
  const over17 = { generated_at: '2026-11-17T04:00:00+09:00', generated_for_date: '2026-11-17' };

  tzTest('GC1 作付け番号が欠落／null／空文字の作付けは載せない側に倒して警告。他は変わらない', () => {
    const extras = [MISSING, null, ''].map((no, i) => cult({ cultivation_no: no, flower_type: `GC1品目${i}` }));
    const { forecast, warnings } = buildForecast(snap([...baseCultivations(), ...extras], over17), []);
    expect(canon(forecast)).toEqual(baseline());
    expect(warnings.filter((w) => w.kind === 'cultivation_no_missing')).toHaveLength(3);
  });

  tzTest('GC2 必須の項目が欠けた作付けは、その作付けだけ外して警告。status を日付から推定して載せない', () => {
    const mk = (over, i) => cult({ flower_type: `GC2品目${i}`, harvest_start: '2026-11-10', ...over });
    const extras = [
      mk({ status: MISSING }, 0),
      mk({ status: null }, 1),
      mk({ status: '' }, 2),
      mk({ variety_counts_usable: MISSING }, 3),
      mk({ current_stage: MISSING }, 4),
      mk({ varieties: MISSING }, 5),
    ];
    const { forecast, warnings } = buildForecast(snap([...baseCultivations(), ...extras], over17), []);
    expect(canon(forecast)).toEqual(baseline());
    expect(crops(forecast).filter((c) => c.startsWith('GC2品目'))).toEqual([]);
    const fields = warnings.filter((w) => w.kind === 'required_field_missing').map((w) => w.field).sort();
    expect(fields).toEqual(['current_stage', 'status', 'status', 'status', 'varieties', 'variety_counts_usable']);
  });

  tzTest('GC3 作付けがオブジェクトでない要素（null・文字列・数）は外して警告。他は変わらない', () => {
    const s = snap(baseCultivations(), over17);
    s.main.cultivations.push(null, 'テキスト', 42);
    const { forecast, warnings } = buildForecast(s, []);
    expect(canon(forecast)).toEqual(baseline());
    expect(warnings.filter((w) => w.kind === 'not_an_object')).toHaveLength(3);
  });
});

describe('GB status は写しのまま使い、HP で推定し直さない', () => {
  tzTest('GB1 status が active のまま収穫開始が基準日より前でも、収穫中（出荷中）に変えない（設計 F-7 の形）', () => {
    const { forecast } = run([cult({ status: 'active', status_source: 'stored', harvest_start: '2026-11-10' })]);
    const rows = rowsOf(forecast);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('growing');
    expect(rows[0].section).toBe('soon'); // 遅れ（予定の月は今月）
  });

  tzTest('GB6 status が空・欠落でも推定しない：その作付けは外れて警告（収穫中として載せたら不合格）', () => {
    const { forecast, warnings } = run([cult({ status: MISSING, harvest_start: '2026-11-10', flower_type: 'ダリア' })]);
    expect(rowsOf(forecast)).toEqual([]);
    expect(warnings.some((w) => w.kind === 'required_field_missing' && w.field === 'status')).toBe(true);
  });

  test('GC0 陽性の土台：SF1〜SF6 から行が出る（GC・GB のテストが空振りしない）', () => {
    const { forecast } = buildForecast(baseSnapshot(), []);
    expect(rowsOf(forecast).length).toBeGreaterThan(0);
  });
});

describe('N11 空の品目は出さない（外れた作付けだけの品目）', () => {
  tzTest('N11 行が0件になった品目は items に出ない', () => {
    const { forecast } = run([
      cult({ flower_type: 'ダリア', status: 'completed' }),
      cult({ flower_type: 'ダリア', status: 'planned' }),
      cult({ flower_type: 'ヒマワリ' }),
    ]);
    expect(crops(forecast)).toEqual(['ヒマワリ']);
  });
});

