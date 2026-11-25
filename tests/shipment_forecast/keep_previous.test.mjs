// 出荷予報 段1：前の日の公開ファイルを守る（追補 §6.5 GK。設計書 §1・§8.2）
// 止まる理由のすべてで、前の公開ファイルが1文字も変わらず、一時ファイル・空ファイルが残らない
import { afterAll, describe, expect } from 'vitest';
import { canon } from './helpers/builders.mjs';
import { sf, prevPublishedText, sfText } from './helpers/fixtures.mjs';
import { cleanupTmp, realIo, runCase } from './helpers/harness.mjs';
import { CASE_OPT_KEYS, NOW_OK, STOP_CASES, STOP_CASE_COUNT, STOP_GROUP_COUNTS } from './helpers/stop_cases.mjs';
import { tzTest } from './helpers/tz.mjs';

afterAll(cleanupTmp);

const PREV = prevPublishedText();

describe('GK 前の日の公開ファイル', () => {
  tzTest('GK1 止まる理由のすべて（78入力）で、前の日の公開ファイルがバイト同一・一時ファイルが残らない・ログと戻り値に目印なし。確かめた件数＝用意した件数', async () => {
    expect(JSON.parse(PREV).items.length).toBeGreaterThanOrEqual(1); // 空のファイルでは「前のまま」を区別できない
    expect(STOP_CASE_COUNT).toBe(78); // 手で数えた件数（GA 3・GV 51・GF 16・GX 3・GU 1・H6 3・D6 1）
    expect(STOP_CASES).toHaveLength(STOP_CASE_COUNT); // 手で数えた件数と一覧の件数が一致（一覧の消し忘れ・足し忘れに気づく）
    for (const [group, n] of Object.entries(STOP_GROUP_COUNTS)) {
      expect(STOP_CASES.filter((x) => x.id.startsWith(group)), group).toHaveLength(n);
    }
    expect(Object.values(STOP_GROUP_COUNTS).reduce((a, b) => a + b, 0)).toBe(STOP_CASE_COUNT);
    let checked = 0;
    for (const c of STOP_CASES) {
      const o = { snapshotText: c.snapshotText ?? sfText(1), now: c.now, prior: PREV };
      for (const k of CASE_OPT_KEYS) if (c[k] !== undefined) o[k] = c[k];
      const out = await runCase(o);
      expect(out.result, c.id).toMatchObject({ exitCode: 1, reason: c.reason });
      expect(out.outText, c.id).toBe(PREV);
      expect(out.outFiles, c.id).toEqual(['shipment_forecast.json']);
      expect(`${out.logText}\n${JSON.stringify(out.result)}`, c.id).not.toMatch(/MARK/); // 読んだ値・例外の本文の目印がログ・戻り値に出ない
      checked += 1;
    }
    expect(checked).toBe(STOP_CASE_COUNT); // 対象0件・途中で抜けて緑にしない
  });

  tzTest('GK2 公開ファイルがまだ無いとき（初回・develop）に止まったら、ファイルを作らない（空のファイルも）', async () => {
    const targets = STOP_CASES.filter((x) => ['GA2', 'GF4', 'GV7', 'D6'].includes(x.id));
    expect(targets).toHaveLength(4); // id の書き換えで対象0件になって緑にならない
    for (const c of targets) {
      const o = { snapshotText: c.snapshotText ?? sfText(1), now: c.now };
      for (const k of CASE_OPT_KEYS) if (c[k] !== undefined) o[k] = c[k];
      const out = await runCase(o);
      expect(out.result, c.id).toMatchObject({ exitCode: 1, reason: c.reason });
      expect(out.outText, c.id).toBeNull();
      expect(out.outFiles, c.id).toEqual([]);
    }
  });

  tzTest('GK3 書き込みの途中で失敗しても、前のファイルが半端にならない（書き込み中・置き換え中の2通り）', async () => {
    const d6 = STOP_CASES.find((x) => x.id === 'D6');
    const mid = await runCase({ snapshotText: sfText(1), now: NOW_OK, prior: PREV, io: d6.io });
    expect(mid.result).toMatchObject({ exitCode: 1, reason: 'write_failed' });
    expect(mid.outText).toBe(PREV);
    expect(mid.outFiles).toEqual(['shipment_forecast.json']);
    expect(`${mid.logText}\n${JSON.stringify(mid.result)}`).not.toMatch(/MARK/); // 例外文の目印（EXC-MARK-D6）が出ない
    const renameFails = { ...realIo, rename: async () => { throw new Error('rename failed EXC-MARK-GK3'); } };
    const late = await runCase({ snapshotText: sfText(1), now: NOW_OK, prior: PREV, io: renameFails });
    expect(late.result).toMatchObject({ exitCode: 1, reason: 'write_failed' });
    expect(late.outText).toBe(PREV);
    expect(late.outFiles).toEqual(['shipment_forecast.json']);
    expect(`${late.logText}\n${JSON.stringify(late.result)}`).not.toMatch(/MARK/);
  });

  tzTest('GK4 写しが前の日と同じなら、公開ファイルも前の日とバイト同一（コミットが起きない元）', async () => {
    const day1 = await runCase({ snapshotText: sfText(1), now: NOW_OK });
    expect(day1.result.exitCode).toBe(0);
    expect(JSON.parse(day1.outText).items.length).toBeGreaterThanOrEqual(1);
    // 翌朝（24時間30分後）に写しの関数が失敗して、同じ写しをもう一度読んだ
    const day2 = await runCase({ snapshotText: sfText(1), now: '2026-11-17T19:30:00Z', prior: day1.outText });
    expect(day2.result).toMatchObject({ exitCode: 0, reason: null });
    expect(day2.outText).toBe(day1.outText);
  });

  tzTest('GK5 成功した日は前の日のファイルが新しい中身に置き換わる（止まる道の「変わらない」が空振りしない）', async () => {
    const s = sf(1);
    s.generated_at = '2026-11-18T04:00:00+09:00';
    s.generated_for_date = '2026-11-18';
    const out = await runCase({ snapshotText: JSON.stringify(s), now: '2026-11-17T19:30:00Z', prior: PREV });
    expect(out.result.exitCode).toBe(0);
    expect(out.outText).not.toBe(PREV);
    expect(JSON.parse(out.outText).generated_at).toBe('2026-11-18T04:00:00+09:00');
    expect(canon(JSON.parse(out.outText)).items.map((i) => i.crop)).toEqual(['トルコ桔梗']);
    expect(out.outFiles).toEqual(['shipment_forecast.json']);
  });
});
