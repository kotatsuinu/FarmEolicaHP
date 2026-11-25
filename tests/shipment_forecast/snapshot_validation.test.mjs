// 出荷予報 段1：写しの検査（追補 §6.2 GV・§6.4 GF）。読み出し口は偽物（決め打ちの保管庫とパスにだけ答える）
// 止まるテストは「終了コード≠0・止まった理由の種類が一致・前の公開ファイルがバイト同一・一時ファイルが残らない・ログに目印0件」をまとめて確かめる
import { afterAll, describe, expect, test } from 'vitest';
import { validateSnapshotText } from '../../scripts/shipment_forecast/snapshot.mjs';
import { runForecast } from '../../scripts/shipment_forecast/run.mjs';
import { canon, cult, snap } from './helpers/builders.mjs';
import { BASE_EXPECTED, LOG_MARKERS } from './helpers/expected.mjs';
import { findMarkers, makeFakeReader, makeLogger } from './helpers/fakes.mjs';
import { combine, prevPublishedText, sf, sfText } from './helpers/fixtures.mjs';
import { cleanupTmp, makeTmpDir, runCase } from './helpers/harness.mjs';
import { CASE_OPT_KEYS, NOW_OK, STOP_CASES, STOP_GROUP_COUNTS, TRUNCATED_TEXT } from './helpers/stop_cases.mjs';
import { tzTest, withTz } from './helpers/tz.mjs';
import path from 'node:path';

afterAll(cleanupTmp);

const SF1_EXPECTED = { generated_at: '2026-11-17T04:00:00+09:00', items: [{ crop: 'トルコ桔梗', rows: BASE_EXPECTED.items[2].rows.slice(0, 5) }] };
const PREV = prevPublishedText();

function opts(c) {
  const o = { snapshotText: c.snapshotText ?? sfText(1), now: c.now, prior: PREV };
  for (const k of CASE_OPT_KEYS) if (c[k] !== undefined) o[k] = c[k];
  return o;
}
// 止まる道の共通の確かめ
async function expectStopped(c) {
  const out = await runCase(opts(c));
  expect(out.result).toMatchObject({ exitCode: 1, reason: c.reason });
  expect(out.outText).toBe(PREV); // 前の日の公開ファイルが1文字も変わらない
  expect(out.outFiles).toEqual(['shipment_forecast.json']); // 一時ファイル・空ファイルが残らない
  const everything = `${out.logText}\n${JSON.stringify(out.result)}`;
  expect(everything).not.toMatch(/MARK/); // 読んだ値・例外の本文の目印がログ・戻り値に出ない
  return out;
}
async function expectUsed(snapshotText, now, extra = {}) {
  const out = await runCase({ snapshotText, now, ...extra });
  expect(out.result).toMatchObject({ exitCode: 0, reason: null });
  expect(out.outText).not.toBeNull();
  return out;
}

describe('GV 写しの形と版', () => {
  test('GV0 検査の部品：検査を通った写しを返す。「今」は必須（省略したら TypeError。既定値で動かない）', () => {
    const snapshot = validateSnapshotText(sfText(1), new Date(NOW_OK));
    expect(snapshot.main.cultivations).toHaveLength(1);
    let err;
    try {
      validateSnapshotText(sfText(1));
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(TypeError);
  });

  test('GV0b 通しの部品も「今」は必須（省略したら TypeError）', async () => {
    const dir = await makeTmpDir();
    const args = { reader: makeFakeReader({ text: sfText(1) }), hiddenListPath: path.join(dir, 'h.json'), outPath: path.join(dir, 'o.json'), logger: makeLogger() };
    await expect(runForecast(args)).rejects.toBeInstanceOf(TypeError);
  });

  tzTest('GV1 版 1 は使う（陽性の土台）：SF1 が期待どおりの行になる', async () => {
    const out = await expectUsed(sfText(1), NOW_OK);
    expect(canon(JSON.parse(out.outText))).toEqual(canon(SF1_EXPECTED));
  });

  test('GV-件数 止まる入力 GV は51件（SF1土台30＋SF10土台20＋目印つきの版1）。一覧の id の書き換えでテストが0件登録になって緑になるのを防ぐ', () => {
    const gv = STOP_CASES.filter((x) => x.id.startsWith('GV'));
    expect(gv).toHaveLength(STOP_GROUP_COUNTS.GV);
    expect(STOP_GROUP_COUNTS.GV).toBe(51);
    expect(gv.filter((x) => x.id.endsWith('-SF10'))).toHaveLength(20);
  });

  for (const c of STOP_CASES.filter((x) => x.id.startsWith('GV'))) {
    tzTest(`${c.id} 止まる（理由＝${c.reason}）`, async () => {
      await expectStopped(c);
    });
  }

  test('GV4-見本 途中で切れた JSON には SF10 の目印が切れ目より前に入っている（ログに出ないことの確かめが空振りしない）', () => {
    expect(findMarkers(TRUNCATED_TEXT(), LOG_MARKERS.map(String)).length).toBeGreaterThan(5);
  });

  tzTest('GV10 知らない項目が増えていても止まらず、公開にも出ない（出力は SF1 のときとバイト同一）', async () => {
    const base = await expectUsed(sfText(1), NOW_OK);
    const s = sf(1);
    s.new_top_field = 'NEW-MARK-TOP';
    s.main.cultivations[0].new_cultivation_field = 'NEW-MARK-CULT';
    s.main.cultivations[0].varieties[0].new_variety_field = 'NEW-MARK-VAR';
    const out = await expectUsed(JSON.stringify(s), NOW_OK);
    expect(out.outText).toBe(base.outText);
    expect(out.outText).not.toContain('NEW-MARK');
    expect(out.logText).not.toContain('NEW-MARK');
  });

  tzTest('GV11 その他作物・今週の作業の形が壊れていても止まらない（出力は SF1 のときとバイト同一）', async () => {
    const base = await expectUsed(sfText(1), NOW_OK);
    const s = sf(1);
    s.other = null;
    s.weekly_tasks = 'テキスト';
    const out = await expectUsed(JSON.stringify(s), NOW_OK);
    expect(out.outText).toBe(base.outText);
  });
});

describe('GF 古さ（写しを作った日時 2026-11-17T04:00:00+09:00＝2026-11-16T19:00:00Z）', () => {
  const used = [
    ['GF1 普段の朝（30分後）は使う', '2026-11-16T19:30:00Z'],
    ['GF2 前の日の写し（24時間30分）も使う', '2026-11-17T19:30:00Z'],
    ['GF3 36時間ちょうどは使う（境目の内側）', '2026-11-18T07:00:00Z'],
    ['GF8 今より5分先までは使う（時計のずれ）', '2026-11-16T18:55:00Z'],
  ];
  for (const [name, now] of used) {
    tzTest(name, async () => {
      const out = await expectUsed(sfText(1), now);
      expect(JSON.parse(out.outText).generated_at).toBe('2026-11-17T04:00:00+09:00');
    });
  }

  tzTest('GF11b 古さは写しの中の日時だけで決める：ファイルの更新日時が古くても、写しの日時が新しければ使う', async () => {
    await expectUsed(sfText(1), NOW_OK, { readerOpts: { updated: '2026-01-01T00:00:00.000Z' } });
  });

  test('GF-件数 止まる入力 GF は16件（SF1土台11＋SF10土台5）', () => {
    const gf = STOP_CASES.filter((x) => x.id.startsWith('GF'));
    expect(gf).toHaveLength(STOP_GROUP_COUNTS.GF);
    expect(STOP_GROUP_COUNTS.GF).toBe(16);
    expect(gf.filter((x) => x.id.endsWith('-SF10'))).toHaveLength(5);
  });

  for (const c of STOP_CASES.filter((x) => x.id.startsWith('GF'))) {
    tzTest(`${c.id} 止まる（理由＝${c.reason}）`, async () => {
      await expectStopped(c);
    });
  }

  test('GF12 実行する PC の時刻帯に依らない：同じ入力の結果が TZ=UTC と TZ=Asia/Tokyo で同じ', async () => {
    const cases = [
      { now: '2026-11-18T07:00:00Z', text: sfText(1) }, // 使う（境目の内側）
      { now: '2026-11-18T07:00:01Z', text: sfText(1) }, // 止まる（境目の外側）
      { now: '2026-11-18T10:30:00Z', text: sfText(1) }, // 止まる（印を無視すると使ってしまう）
    ];
    const results = {};
    for (const tz of ['UTC', 'Asia/Tokyo']) {
      results[tz] = await withTz(tz, async () => {
        const rs = [];
        for (const c of cases) {
          const { result, outText } = await runCase({ snapshotText: c.text, now: c.now, prior: PREV });
          rs.push({ exitCode: result.exitCode, reason: result.reason, out: outText });
        }
        return rs;
      });
    }
    expect(results.UTC).toEqual(results['Asia/Tokyo']);
    expect(results.UTC.map((r) => r.exitCode)).toEqual([0, 1, 1]);
  });
});

const EMPTY_1113 = ['{', '  "generated_at": "2026-11-13T04:00:00+09:00",', '  "items": []', '}', ''].join(String.fromCharCode(10));
const EMPTY_1117 = ['{', '  "generated_at": "2026-11-17T04:00:00+09:00",', '  "items": []', '}', ''].join(String.fromCharCode(10));
const NOW_1113 = '2026-11-12T19:30:00Z'; // snap() の写し（2026-11-13T04:00:00+09:00）の30分後

describe('GX 書き出す行が0件のとき：不備で外れた作付けがあれば止まり、なければ正常な空（冬）', () => {
  test('GX-件数 止まる入力 GX は3件', () => {
    expect(STOP_CASES.filter((x) => x.id.startsWith('GX'))).toHaveLength(STOP_GROUP_COUNTS.GX);
    expect(STOP_GROUP_COUNTS.GX).toBe(3);
  });

  for (const c of STOP_CASES.filter((x) => x.id.startsWith('GX'))) {
    tzTest(`${c.id} 止まる（理由＝${c.reason}）。前の公開ファイルは変わらず、読んだ値の目印がログに出ない`, async () => {
      await expectStopped(c);
    });
  }

  tzTest('GX4 不備が0件で0行は正常（境目の相方）：全部を載せない一覧で隠したら、終了コード0・items が空の公開ファイル', async () => {
    const hidden = '[{"cultivation_no": "209901", "reason": "テスト"}, {"cultivation_no": "209903", "reason": "テスト"}]';
    const out = await runCase({ snapshot: combine(sf(1), sf(3)), now: NOW_OK, hidden, prior: PREV });
    expect(out.result).toMatchObject({ exitCode: 0, reason: null });
    expect(out.outText).toBe(EMPTY_1117);
  });

  tzTest('GX5 不備が0件で0行は正常：全作付けが「収穫の終わりが先月・収穫中でない」で外れても、警告なしの空（外れるが不備ではない）', async () => {
    const s = snap([cult({ harvest_start: '2026-09-01', harvest_end: '2026-10-31', flower_type: 'ダリア' }), cult({ harvest_start: '2026-09-01', harvest_end: '2026-10-31', flower_type: 'ヒマワリ' })]);
    const out = await runCase({ snapshot: s, now: NOW_1113, prior: PREV });
    expect(out.result).toMatchObject({ exitCode: 0, reason: null });
    expect(out.result.warnings).toEqual([]);
    expect(out.outText).toBe(EMPTY_1113);
    // 相方：終わりが今月の初日なら載る（空の出力が何でも通っていないことの確かめ）
    const keep = snap([cult({ harvest_start: '2026-09-01', harvest_end: '2026-11-01', flower_type: 'ダリア' })]);
    const kept = await runCase({ snapshot: keep, now: NOW_1113 });
    expect(JSON.parse(kept.outText).items.map((i) => i.crop)).toEqual(['ダリア']);
  });

  tzTest('GX6 不備で1件外れても、他に載る行が1件以上あれば正常（止まらない）：収穫開始の読めない作付けが1件＋載る作付け', async () => {
    const s = snap([cult({ flower_type: 'ダリア' }), cult({ flower_type: 'ヒマワリ', harvest_start: '2026/12/10 MARK-HS' })]);
    const out = await runCase({ snapshot: s, now: NOW_1113 });
    expect(out.result).toMatchObject({ exitCode: 0, reason: null });
    expect(JSON.parse(out.outText).items.map((i) => i.crop)).toEqual(['ダリア']);
    expect(out.result.warnings.map((w) => w.kind)).toEqual(['harvest_start_unreadable']);
    expect(`${out.logText}\n${JSON.stringify(out.result)}`).not.toMatch(/MARK/);
  });
});
