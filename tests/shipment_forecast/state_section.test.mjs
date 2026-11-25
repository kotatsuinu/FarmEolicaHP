// 出荷予報 段1：状態の札・区分・基準日（あらすじ §6.4 B1〜B9・§6.5 K・追補 §6.6 GD・§6.7 GB2〜GB5）
// 状態の段階名は写しの値（品種の行は current_stage_effective、総数の1行は current_stage.representative）をそのまま使う
import { afterAll, describe, expect } from 'vitest';
import { buildForecast } from '../../scripts/shipment_forecast/forecast.mjs';
import { cult, rowsOf, snap, stageBase, stageEff, totalOnly, variety } from './helpers/builders.mjs';
import { cleanupTmp, runCase } from './helpers/harness.mjs';
import { tzTest } from './helpers/tz.mjs';

afterAll(cleanupTmp);

// 段階名つきの作付け（品種1つ。品種の行の段階＝current_stage_effective）
function withStage(name, over = {}) {
  const eff = name === undefined ? null : stageEff(name);
  return cult({ varieties: [variety('ホワイト', 800, { current_stage_effective: eff })], ...over });
}
const statusOf = (c, over) => rowsOf(buildForecast(snap([c], over), []).forecast)[0]?.status;
const sectionOf = (c, over) => rowsOf(buildForecast(snap([c], over), []).forecast)[0]?.section;

describe('B 状態4種（段階名の語の当たり方は HP 側に残る）', () => {
  tzTest('B1 status が harvesting なら段階名に関係なく収穫中', () => {
    for (const name of ['育苗', '蕾形成']) expect(statusOf(withStage(name, { status: 'harvesting' })), name).toBe('harvesting');
  });

  tzTest('B2 「つぼみ」系の語を含む段階名は bud', () => {
    for (const name of ['つぼみ', '蕾形成', '発蕾', '出蕾〜開花', '出蕾・開花', '蕾形成・開花']) {
      expect(statusOf(withStage(name)), name).toBe('bud');
    }
  });

  tzTest('B3 「蕾」を含めば bud（ストックの実名の確認）', () => {
    expect(statusOf(withStage('抽台・蕾整理'))).toBe('bud');
  });

  tzTest('B4 「育苗」系の語（育苗・播種・発芽・挿し穂・発根・苗立ち・直播）を含む段階名は seedling', () => {
    for (const name of ['育苗', 'ハウス育苗', '育苗・八重鑑別', '播種・発芽', '苗立ち・発芽揃い', '挿し穂・発根促進', '苗立ち', '圃場準備・直播']) {
      expect(statusOf(withStage(name)), name).toBe('seedling');
    }
  });

  tzTest('B7 蕾と育苗の両方を含めば bud（順の確認）', () => {
    expect(statusOf(withStage('育苗・蕾整理'))).toBe('bud');
  });

  tzTest('B8 収穫段階の名前では収穫中にしない', () => {
    for (const name of ['収穫・出荷', '開花・出荷', '開花・採花']) expect(statusOf(withStage(name)), name).toBe('growing');
  });

  tzTest('B9 どれにも当たらなければ growing（落ちない）。直挿し・花芽は育苗・つぼみに当たらない', () => {
    // 先頭4つは 11/24 の実物の段階名（区切りの「▸」を含む）
    for (const name of ['摘心 ▸ 分枝促進', '栄養成長', '頂花取り ▸ 分枝促進', '活着 ▸ 栄養成長', '定植・活着', '直挿し・活着', '花芽分化', '花芽形成期', '', null, undefined]) {
      expect(statusOf(withStage(name)), String(name)).toBe('growing');
    }
  });
});

describe('GB 品種の行・総数の1行の段階は写しの値をそのまま使う', () => {
  tzTest('GB2・GB3 品種の行は current_stage_effective の段階名で判定（自身の段階・作付け全体の段階の選び直しをしない）', () => {
    const c = cult({
      variety_counts_usable: true,
      planned_count_total: 1000,
      varieties: [
        // 品種自身の段階なし・作付け全体の「蕾形成」が effective（source cultivation）→ bud
        variety('アルファ', 500, { current_stage: null, current_stage_effective: stageEff('蕾形成', 'cultivation') }),
        // 品種自身も effective もともに「育苗」・作付け全体は「蕾形成」→ 品種を優先して seedling
        variety('ベータ', 500, { current_stage: stageBase('育苗'), current_stage_effective: stageEff('育苗', 'variety') }),
      ],
      current_stage: { cultivation: stageBase('蕾形成'), representative: stageBase('蕾形成') },
    });
    const rows = rowsOf(buildForecast(snap([c]), []).forecast);
    expect(rows.map((r) => [r.variety, r.status])).toEqual([
      ['アルファ', 'bud'],
      ['ベータ', 'seedling'],
    ]);
  });

  tzTest('GB4 総数の1行は current_stage.representative の段階名で判定', () => {
    const c = totalOnly(900, {
      varieties: [variety('アルファ', null), variety('ベータ', null)],
      current_stage: { cultivation: null, representative: stageBase('発蕾') },
    });
    const rows = rowsOf(buildForecast(snap([c]), []).forecast);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('bud');
  });

  tzTest('GB5 段階が何も無ければ growing（品種の行・総数の1行とも）', () => {
    const perVariety = cult({ varieties: [variety('アルファ', 500, { current_stage_effective: null })], current_stage: { cultivation: null, representative: null } });
    expect(statusOf(perVariety)).toBe('growing');
    const total = totalOnly(900, { current_stage: { cultivation: null, representative: null } });
    expect(statusOf(total)).toBe('growing');
  });
});

describe('K 区分（基準日＝写しの generated_for_date。特に断りが無ければ 2026-11-13）', () => {
  const at = (date) => ({ generated_at: `${date}T04:00:00+09:00`, generated_for_date: date });

  tzTest('K1・K2 今月（月初・月末）は soon', () => {
    for (const hs of ['2026-11-01', '2026-11-30']) expect(sectionOf(cult({ harvest_start: hs })), hs).toBe('soon');
  });

  tzTest('K3 翌月（月初・月末）は soon', () => {
    for (const hs of ['2026-12-01', '2026-12-31']) expect(sectionOf(cult({ harvest_start: hs })), hs).toBe('soon');
  });

  tzTest('K4 再来月の月初は later（境目の相方）', () => {
    expect(sectionOf(cult({ harvest_start: '2027-01-01' }))).toBe('later');
  });

  tzTest('K5 再来月以降は later', () => {
    for (const hs of ['2027-01-05', '2027-03-10']) expect(sectionOf(cult({ harvest_start: hs })), hs).toBe('later');
  });

  tzTest('K6 遅れ（予定の月を過ぎてまだ収穫中でない）は soon', () => {
    expect(sectionOf(withStage('つぼみ', { harvest_start: '2026-09-01' }))).toBe('soon');
    expect(sectionOf(cult({ harvest_start: '2026-10-31' }))).toBe('soon');
  });

  tzTest('K7 収穫中は状態が優先で shipping', () => {
    expect(sectionOf(cult({ harvest_start: '2026-09-01', status: 'harvesting' }))).toBe('shipping');
  });

  tzTest('K8 来年の同じ月番号を今月と取り違えない', () => {
    expect(sectionOf(cult({ harvest_start: '2027-11-05' }))).toBe('later');
  });

  tzTest('K9 年またぎの翌月（基準日 2026-12-31・収穫開始 2027-01-05）は soon', () => {
    expect(sectionOf(cult({ harvest_start: '2027-01-05' }), at('2026-12-31'))).toBe('soon');
  });

  tzTest('K10 年またぎの再来月（基準日 2026-12-31・収穫開始 2027-02-01）は later', () => {
    expect(sectionOf(cult({ harvest_start: '2027-02-01' }), at('2026-12-31'))).toBe('later');
  });

  tzTest('K11 年が明けた後の過去月（基準日 2027-01-01・収穫開始 2026-12-31）は soon（遅れ）', () => {
    expect(sectionOf(cult({ harvest_start: '2026-12-31' }), at('2027-01-01'))).toBe('soon');
  });

  tzTest('K12（反転）実行時刻を 2026-12-31T14:59:59Z／15:00:00Z に変えても、写しが同じなら区分も出力もバイト同一', async () => {
    const snapshot = snap([cult({ harvest_start: '2027-02-05', flower_type: 'ダリア' })], at('2026-12-31'));
    const a = await runCase({ snapshot, now: '2026-12-31T14:59:59Z' });
    const b = await runCase({ snapshot, now: '2026-12-31T15:00:00Z' });
    expect(a.result.exitCode).toBe(0);
    expect(b.result.exitCode).toBe(0);
    expect(a.outText).not.toBeNull();
    expect(b.outText).toBe(a.outText);
    expect(JSON.parse(a.outText).items[0].rows[0].section).toBe('later');
  });
});

describe('GD 日付は写しを作った日（実行した日ではない）', () => {
  const sectionAfterRun = async (snapshot, now) => {
    const { result, outText } = await runCase({ snapshot, now });
    expect(result.exitCode).toBe(0);
    return JSON.parse(outText);
  };

  tzTest('GD1 区分の基準日は写しを作った日：実行が翌日（12/1 4:30）でも 11/30 から数える', async () => {
    const snapshot = snap([cult({ harvest_start: '2027-01-05' })], { generated_at: '2026-11-30T04:00:00+09:00', generated_for_date: '2026-11-30' });
    const out = await sectionAfterRun(snapshot, '2026-11-30T19:30:00Z');
    expect(out.items[0].rows[0].section).toBe('later'); // 実行した日（12月）を基準にすると soon に誤る
  });

  tzTest('GD2 公開ファイルの generated_at は写しの generated_at をそのまま写す（実行時刻にしない）', async () => {
    const snapshot = snap([cult({})], { generated_at: '2026-11-17T04:00:12+09:00', generated_for_date: '2026-11-17' });
    const out = await sectionAfterRun(snapshot, '2026-11-16T19:30:00Z');
    expect(out.generated_at).toBe('2026-11-17T04:00:12+09:00');
  });

  tzTest('GD3 載せる／外すの「先月」も基準日で数える（実行日の12月なら 11-15 が先月になって誤って外れる）', async () => {
    const snapshot = snap(
      [
        cult({ flower_type: 'ダリア', harvest_start: '2026-09-01', harvest_end: '2026-11-15' }),
        cult({ flower_type: 'ヒマワリ', harvest_start: '2026-09-01', harvest_end: '2026-10-31' }),
      ],
      { generated_at: '2026-11-30T04:00:00+09:00', generated_for_date: '2026-11-30' },
    );
    const out = await sectionAfterRun(snapshot, '2026-11-30T19:30:00Z');
    expect(out.items.map((i) => i.crop)).toEqual(['ダリア']);
    expect(out.items[0].rows[0].harvest_to).toBe('2026-11');
  });

  tzTest('GD4 年またぎの基準日：写しの日 2026-12-31・実行は 2027/1/1 4:30 でも later', async () => {
    const snapshot = snap([cult({ harvest_start: '2027-02-05' })], { generated_at: '2026-12-31T04:00:00+09:00', generated_for_date: '2026-12-31' });
    const out = await sectionAfterRun(snapshot, '2026-12-31T19:30:00Z');
    expect(out.items[0].rows[0].section).toBe('later'); // 実行した日（2027年1月）を基準にすると soon に誤る
  });

  tzTest('GD5 基準日を UTC に直してから取らない：日本時間 12/1 4:00 は UTC では 11/30 だが、基準日は 12月', async () => {
    const snapshot = snap([cult({ harvest_start: '2027-01-05' })], { generated_at: '2026-12-01T04:00:00+09:00', generated_for_date: '2026-12-01' });
    const out = await sectionAfterRun(snapshot, '2026-11-30T19:30:00Z');
    expect(out.items[0].rows[0].section).toBe('soon'); // UTC の月（11月）で数えると later に誤る
  });
});
