// 出荷予報 段1：本番の入口（scripts/fetch_shipment_forecast.mjs）を起動して通す（追補 §4.3「時計の結線」・GA5・GA6・GA4・W3）
// 入口は時計を固定した偽の世界（保管庫・トークンの偽の応答）の中で、本物のまま動かす。書き出し先は一時フォルダの小さなリポジトリ
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, test } from 'vitest';
import { LOG_MARKERS } from './helpers/expected.mjs';
import { runEntry } from './helpers/entry.mjs';
import { STACK_LINE, findMarkers } from './helpers/fakes.mjs';
import { allSnapshot, prevPublishedText, sfText } from './helpers/fixtures.mjs';
import { cleanupTmp, makeTmpDir } from './helpers/harness.mjs';
import { testKey } from './helpers/testkey.mjs';

afterAll(cleanupTmp);

const PREV = prevPublishedText();
const TZS = ['UTC', 'Asia/Tokyo'];
const T = 90000;
const DATA_FILES = ['shipment_forecast.json', 'shipment_forecast_hidden.json'];

describe('入口（スクリプトの起動）', () => {
  for (const tz of TZS) {
    test(`GF3-入口 36時間ちょうどは使う：終了コード0・公開ファイルができ、保管庫への問い合わせはトークン1回と決め打ちの1ファイルの GET だけ [TZ=${tz}]`, async () => {
      const r = await runEntry({ tz, now: '2026-11-18T07:00:00Z', snapshotText: sfText(1) });
      expect(r.code, r.output).toBe(0);
      const out = JSON.parse(r.outText);
      expect(out.generated_at).toBe('2026-11-17T04:00:00+09:00');
      expect(out.items.length).toBeGreaterThanOrEqual(1);
      const kinds = r.fetchLog.map((e) => `${e.kind}:${e.method}`);
      expect(kinds.sort()).toEqual(['object:GET', 'token:POST']); // 一覧・別の保管庫・メタデータサーバへの問い合わせは0件
      expect(r.fetchLog.find((e) => e.kind === 'token').ok).toBe(true); // 署名つきの申し込みが正しく作れている
    }, T);

    test(`GF4-入口 36時間を1秒でも過ぎたら止まる：終了コード≠0・理由＝snapshot_stale・前の公開ファイルは変わらない・ログに鍵や写しの中身なし [TZ=${tz}]`, async () => {
      const r = await runEntry({ tz, now: '2026-11-18T07:00:01Z', snapshotText: sfText(1), prior: PREV });
      expect(r.code).not.toBe(0);
      expect(r.output).toContain('reason=snapshot_stale');
      expect(r.outText).toBe(PREV);
      expect(r.dataFiles).toEqual(DATA_FILES);
      expect(STACK_LINE.test(r.output)).toBe(false);
      expect(r.output).not.toMatch(/MARK/);
    }, T);
  }

  test('GA5-入口 鍵が空でも別の認証に落ちない：環境に別の鍵（GOOGLE_APPLICATION_CREDENTIALS）があっても、止まる（理由＝key_missing）・保管庫への問い合わせは0件', async () => {
    const dir = await makeTmpDir();
    const otherKey = path.join(dir, 'other_credentials.json');
    fs.writeFileSync(otherKey, testKey().json);
    const r = await runEntry({ now: '2026-11-16T19:30:00Z', snapshotText: sfText(1), prior: PREV, keyJson: null, extraEnv: { GOOGLE_APPLICATION_CREDENTIALS: otherKey } });
    expect(r.code).not.toBe(0);
    expect(r.output).toContain('reason=key_missing');
    expect(r.fetchLog).toEqual([]); // トークンもメタデータサーバも保管庫も呼ばれない
    expect(r.outText).toBe(PREV);
    expect(STACK_LINE.test(r.output)).toBe(false);
  }, T);

  test('GA6-入口 壊れた鍵でも中身を出さずに止まる：理由＝key_unreadable・出力に鍵の内容（目印）なし・問い合わせ0件', async () => {
    const r = await runEntry({ now: '2026-11-16T19:30:00Z', snapshotText: sfText(1), prior: PREV, keyJson: '{"client_email": "KEYMARK-bad@example.test", "private_key": ' });
    expect(r.code).not.toBe(0);
    expect(r.output).toContain('reason=key_unreadable');
    expect(r.output).not.toContain('KEYMARK');
    expect(r.fetchLog).toEqual([]);
    expect(r.outText).toBe(PREV);
  }, T);

  test('GA4-入口 通信が例外になったら止まる（理由＝fetch_failed）。例外の本文（目印）も経過の表示もログに出ない・前の公開ファイルは変わらない', async () => {
    const r = await runEntry({ now: '2026-11-16T19:30:00Z', snapshotText: sfText(1), prior: PREV, mode: 'throw', throwMessage: 'EXC-MARK-ENTRY LOC-MARK-01' });
    expect(r.code).not.toBe(0);
    expect(r.output).toContain('reason=fetch_failed');
    expect(r.output).not.toMatch(/MARK/);
    expect(STACK_LINE.test(r.output)).toBe(false);
    expect(r.outText).toBe(PREV);
  }, T);

  test('GA3-入口 権限なし（403）・見つからない（404）はそれぞれ別の理由で止まる', async () => {
    for (const [mode, reason] of [['status:403', 'snapshot_forbidden'], ['status:404', 'snapshot_not_found']]) {
      const r = await runEntry({ now: '2026-11-16T19:30:00Z', snapshotText: sfText(1), prior: PREV, mode });
      expect(r.code, mode).not.toBe(0);
      expect(r.output, mode).toContain(`reason=${reason}`);
      expect(r.outText, mode).toBe(PREV);
    }
  }, T);

  test('W3-入口 成功の道でも、標準出力・標準エラー・GitHub の注釈（::warning::）に写しの非公開の目印が出ない。警告は注釈の形で出る', async () => {
    const r = await runEntry({ now: '2026-11-16T19:30:00Z', snapshotText: JSON.stringify(allSnapshot()) });
    expect(r.code, r.output).toBe(0);
    expect(findMarkers(r.output, LOG_MARKERS.map(String))).toEqual([]);
    expect(r.output).not.toContain('KEYMARK');
    const warnings = r.output.split('\n').filter((l) => l.includes('::warning::'));
    expect(warnings.length).toBeGreaterThan(0); // SF4・SF5・SF7・SF9 などの警告が出ている
    for (const l of warnings) expect(l).toMatch(/kind=\w+/);
    expect(STACK_LINE.test(r.output)).toBe(false);
  }, T);
});
