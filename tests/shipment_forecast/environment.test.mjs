// 出荷予報 段1：テストの足場の確かめ。時刻帯の切り替えが、このPCで本当に効いている（効いていなければ「両方で流した」ことにならない）
import { spawnSync } from 'node:child_process';
import { describe, expect, test } from 'vitest';
import { TZS, withTz } from './helpers/tz.mjs';

const EXPECTED_OFFSET = { UTC: 0, 'Asia/Tokyo': -540 }; // getTimezoneOffset は「UTC − 現地」の分

describe('TZ0 時刻帯の切り替え', () => {
  for (const tz of TZS) {
    test(`TZ0-同じプロセス内 TZ=${tz} に切り替えると現地の時刻が変わる`, async () => {
      await withTz(tz, () => {
        expect(new Date(2026, 0, 1).getTimezoneOffset()).toBe(EXPECTED_OFFSET[tz]);
        // 日本時間の 0 時前後が UTC の前日になるか（日付またぎの確かめの土台）
        expect(new Date('2026-12-31T15:00:00Z').getDate()).toBe(tz === 'UTC' ? 31 : 1);
      });
    });

    test(`TZ0-別プロセス（入口の起動と同じやり方）TZ=${tz} の環境変数で起動すると現地の時刻が変わる`, () => {
      const r = spawnSync(process.execPath, ['-e', 'process.stdout.write(String(new Date(2026, 0, 1).getTimezoneOffset()))'], {
        env: { ...process.env, TZ: tz },
        encoding: 'utf8',
      });
      expect(r.stdout).toBe(String(EXPECTED_OFFSET[tz]));
    });
  }

  test('TZ0-戻し withTz が終わったあと、元の時刻帯に戻る', async () => {
    const before = process.env.TZ;
    await withTz('Asia/Tokyo', () => {});
    expect(process.env.TZ).toBe(before);
  });
});
