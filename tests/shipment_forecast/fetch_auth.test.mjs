// 出荷予報 段1：写しの取得と鍵（追補 §6.1 GA。設計書 §2.1・§2.3 の1〜3・§9）
// 偽の読み出し口は決め打ちの保管庫とパスにだけ答える。鍵の組み立ては偽の読み出し口に載せず単独で試す
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, afterEach, describe, expect, test, vi } from 'vitest';
import { buildCredentials } from '../../scripts/shipment_forecast/credentials.mjs';
import { createStorageReader } from '../../scripts/shipment_forecast/storage_reader.mjs';
import { STOP_REASONS } from '../../scripts/shipment_forecast/errors.mjs';
import { canon } from './helpers/builders.mjs';
import { BASE_EXPECTED } from './helpers/expected.mjs';
import { FIXED_BUCKET, FIXED_PATH, makeFakeReader } from './helpers/fakes.mjs';
import { ALL_REASONS } from './helpers/reasons.mjs';
import { ROOT, baseSnapshot, prevPublishedText, sfText } from './helpers/fixtures.mjs';
import { cleanupTmp, makeTmpDir, runCase } from './helpers/harness.mjs';
import { NOW_OK, STOP_CASES } from './helpers/stop_cases.mjs';
import { testKey } from './helpers/testkey.mjs';
import { tzTest } from './helpers/tz.mjs';

afterAll(cleanupTmp);
afterEach(() => vi.restoreAllMocks());

const PREV = prevPublishedText();
const thrown = (fn) => {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return undefined;
};
const KEY_ENV = 'CULTIVATION_SNAPSHOT_READER_KEY';

describe('GA 写しの取得', () => {
  test('R0 止まった理由の種類の値：実装の定数が手書きの一覧と一致する（重複・取り違えが無い）', () => {
    expect(Object.values(STOP_REASONS).sort()).toEqual([...ALL_REASONS].sort());
    expect(new Set(Object.values(STOP_REASONS)).size).toBe(ALL_REASONS.length);
  });

  test('GA0 偽の読み出し口の確かめ：決め打ち以外の保管庫・パスには「無い」を返す（パスを間違えても答えてしまわない）', async () => {
    const r = makeFakeReader({ text: 'x' });
    expect((await r.readObject({ bucket: FIXED_BUCKET, path: FIXED_PATH })).status).toBe(200);
    expect((await r.readObject({ bucket: 'other-bucket', path: FIXED_PATH })).status).toBe(404);
    expect((await r.readObject({ bucket: FIXED_BUCKET, path: 'cultivation_snapshot/other.json' })).status).toBe(404);
  });

  tzTest('GA1 決め打ちの保管庫とパスの1ファイルだけを取る（陽性の土台）：一覧は取らない', async () => {
    const out = await runCase({ snapshot: baseSnapshot(), now: NOW_OK });
    expect(out.result).toMatchObject({ exitCode: 0, reason: null });
    expect(out.reader.calls.list).toEqual([]);
    expect(out.reader.calls.read).toEqual([{ bucket: 'fe-cultivation-snapshot', path: 'cultivation_snapshot/latest.json' }]);
    expect(canon(JSON.parse(out.outText))).toEqual(canon(BASE_EXPECTED));
  });

  for (const c of STOP_CASES.filter((x) => x.id.startsWith('GA'))) {
    tzTest(`${c.id} 止まる（理由＝${c.reason}）。前の公開ファイルは変わらず、例外の本文（目印）はログに出ない`, async () => {
      const out = await runCase({ snapshotText: sfText(1), now: c.now, prior: PREV, readerOpts: c.readerOpts });
      expect(out.result).toMatchObject({ exitCode: 1, reason: c.reason });
      expect(out.outText).toBe(PREV);
      expect(out.outFiles).toEqual(['shipment_forecast.json']);
      expect(`${out.logText}\n${JSON.stringify(out.result)}`).not.toMatch(/MARK/);
    });
  }

  tzTest('GA3b 401 も権限なしとして止まる／GA4b 想定外の状態（500）は通信の失敗として止まる', async () => {
    for (const [status, reason] of [[401, 'snapshot_forbidden'], [500, 'fetch_failed']]) {
      const out = await runCase({ snapshotText: sfText(1), now: NOW_OK, prior: PREV, readerOpts: { status } });
      expect(out.result, String(status)).toMatchObject({ exitCode: 1, reason });
      expect(out.outText).toBe(PREV);
    }
  });
});

describe('GA 読み出し口（保管庫の1ファイルを GET するだけ）', () => {
  const calls = [];
  function fakeFetch(storageResponse) {
    return async (url, init = {}) => {
      calls.push({ url: String(url), method: init.method ?? 'GET', headers: init.headers ?? {} });
      if (String(url) === testKey().tokenUri) {
        return new Response(JSON.stringify({ access_token: 'fake-access-token', expires_in: 3600, token_type: 'Bearer' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (storageResponse instanceof Error) throw storageResponse;
      return new Response(storageResponse.body ?? '', { status: storageResponse.status });
    };
  }
  const credentials = () => ({ clientEmail: testKey().clientEmail, privateKey: testKey().privatePem, tokenUri: testKey().tokenUri });
  const storageCalls = () => calls.filter((c) => c.url !== testKey().tokenUri);

  test('GA8 読み出し口：決め打ちの1ファイルを GET し（一覧の URL を使わない）、取れた状態をそのまま返す', async () => {
    calls.length = 0;
    const reader = createStorageReader({ credentials: credentials(), fetchImpl: fakeFetch({ status: 200, body: '{"a":1}' }) });
    const res = await reader.readObject({ bucket: FIXED_BUCKET, path: FIXED_PATH });
    expect(res).toMatchObject({ status: 200, text: '{"a":1}' });
    expect(storageCalls()).toHaveLength(1);
    const c = storageCalls()[0];
    expect(c.method).toBe('GET');
    expect(c.url).toContain('fe-cultivation-snapshot');
    expect(decodeURIComponent(c.url)).toContain('cultivation_snapshot/latest.json');
    expect(JSON.stringify(c.headers)).toContain('Bearer fake-access-token');
  });

  test('GA8b 404・403・500 は状態として返し、通信の例外はそのまま投げる（呼び出し側が理由を決める）', async () => {
    for (const status of [404, 403, 500]) {
      const reader = createStorageReader({ credentials: credentials(), fetchImpl: fakeFetch({ status }) });
      expect((await reader.readObject({ bucket: FIXED_BUCKET, path: FIXED_PATH })).status, String(status)).toBe(status);
    }
    const reader = createStorageReader({ credentials: credentials(), fetchImpl: fakeFetch(new TypeError('fetch failed')) });
    await expect(reader.readObject({ bucket: FIXED_BUCKET, path: FIXED_PATH })).rejects.toThrow();
  });
});

describe('GA5・GA6 鍵の組み立て（単独で試す）', () => {
  tzTest('GA5 鍵が未設定・空なら例外（理由＝鍵が無い）。別の鍵や既定の認証を探しに行かない', async () => {
    const dir = await makeTmpDir();
    const otherKeyFile = path.join(dir, 'other_credentials.json');
    fs.writeFileSync(otherKeyFile, testKey().json); // 環境にある別の鍵（これを読んだら不合格）
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const readSpies = [vi.spyOn(fs, 'readFileSync'), vi.spyOn(fs.promises, 'readFile'), vi.spyOn(fs, 'existsSync')];
    for (const env of [{ GOOGLE_APPLICATION_CREDENTIALS: otherKeyFile }, { [KEY_ENV]: '', GOOGLE_APPLICATION_CREDENTIALS: otherKeyFile }]) {
      const e = thrown(() => buildCredentials(env));
      expect(e, JSON.stringify(Object.keys(env))).toMatchObject({ reason: 'key_missing' });
      expect(`${e.message}${e.stack}`).not.toContain(otherKeyFile);
      expect(`${e.message}${e.stack}`).not.toContain('KEYMARK');
    }
    expect(fetchSpy).not.toHaveBeenCalled(); // メタデータサーバ等へ聞きに行かない
    for (const spy of readSpies) {
      expect(spy.mock.calls.some((args) => String(args[0]).includes('other_credentials')), 'GOOGLE_APPLICATION_CREDENTIALS のファイルを読まない').toBe(false);
    }
  });

  tzTest('GA5b 正しい鍵なら認証の設定ができる（陽性）', () => {
    const c = buildCredentials({ [KEY_ENV]: testKey().json });
    expect(c).toMatchObject({ clientEmail: testKey().clientEmail, tokenUri: testKey().tokenUri });
    expect(c.privateKey).toBe(testKey().privatePem);
  });

  tzTest('GA6 壊れた鍵でも中身を出さずに止まる（理由＝鍵が読めない）：例外文・経過の表示に鍵の内容（目印）が出ない', () => {
    const bad = {
      'JSON でない': '{"client_email": "KEYMARK-x@example.test", "private_key": ',
      '配列': '["KEYMARK-array"]',
      'メールが無い': JSON.stringify({ private_key: testKey().privatePem, note: 'KEYMARK-note' }),
      '秘密鍵が無い': JSON.stringify({ client_email: 'KEYMARK-y@example.test', note: 'KEYMARK-note' }),
      '秘密鍵として読めない': JSON.stringify({ client_email: 'KEYMARK-z@example.test', private_key: 'KEYMARK-not-a-pem' }),
    };
    for (const [label, value] of Object.entries(bad)) {
      const e = thrown(() => buildCredentials({ [KEY_ENV]: value }));
      expect(e, label).toMatchObject({ reason: 'key_unreadable' });
      expect(`${e.message}\n${e.stack}`, label).not.toContain('KEYMARK');
    }
  });
});

describe('GA7 部品は読むだけ', () => {
  test('GA7 部品のコードに保管庫への書き込みが0件。読み出しの呼び出しは1件以上（対象0件で緑にしない）', () => {
    const dir = path.join(ROOT, 'scripts', 'shipment_forecast');
    const files = [...fs.readdirSync(dir).filter((f) => f.endsWith('.mjs')).map((f) => path.join(dir, f)), path.join(ROOT, 'scripts', 'fetch_shipment_forecast.mjs')];
    const source = files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
    // 書き込み系：保管庫の保存・更新・削除・アップロード、PUT/PATCH/DELETE、書き込み用の範囲
    for (const pattern of [/\.(save|upload|setMetadata|createWriteStream)\s*\(/, /method\s*:\s*['"](PUT|PATCH|DELETE)['"]/i, /uploadType=/, /devstorage\.(read_write|full_control)/]) {
      expect(source, String(pattern)).not.toMatch(pattern);
    }
    // 読み出し：fetch の呼び出しと読み出し口が実在する
    expect(source).toMatch(/\bfetch\s*\(|fetchImpl\s*\(/);
    expect(source).toMatch(/readObject/);
  });
});
