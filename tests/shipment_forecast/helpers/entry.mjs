// 本番の入口（scripts/fetch_shipment_forecast.mjs）をそのまま起動して通す道具
// 入口は自分の位置から書き出し先・載せない一覧の固定のパスを決めるので、scripts/ を一時フォルダの「小さなリポジトリ」へ写して動かす
// （本物の src/data/shipment_forecast.json は作らない）。鍵は実行のたびに作る・偽の世界は preload_fake_world.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { HELPERS_DIR, ROOT } from './fixtures.mjs';
import { makeTmpDir } from './harness.mjs';
import { testKey } from './testkey.mjs';

const PRELOAD = path.join(HELPERS_DIR, 'preload_fake_world.mjs');

// opts: now(ISO)・snapshotText・tz・prior・mode・throwMessage・keyJson（null で鍵なし）・extraEnv・hidden
export async function runEntry(opts) {
  const repo = await makeTmpDir('sf-entry-');
  fs.cpSync(path.join(ROOT, 'scripts'), path.join(repo, 'scripts'), { recursive: true });
  const dataDir = path.join(repo, 'src', 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'shipment_forecast_hidden.json'), opts.hidden ?? '[]');
  const outPath = path.join(dataDir, 'shipment_forecast.json');
  if (opts.prior !== undefined && opts.prior !== null) fs.writeFileSync(outPath, opts.prior);

  const world = path.join(repo, '_world');
  fs.mkdirSync(world);
  const snapshotFile = path.join(world, 'snapshot.json');
  fs.writeFileSync(snapshotFile, opts.snapshotText);
  const logFile = path.join(world, 'fetch_log.jsonl');
  const configFile = path.join(world, 'config.json');
  fs.writeFileSync(
    configFile,
    JSON.stringify({
      nowIso: opts.now,
      snapshotFile,
      mode: opts.mode ?? 'ok',
      publicPem: testKey().publicKey.export({ type: 'spki', format: 'pem' }),
      clientEmail: testKey().clientEmail,
      logFile,
      throwMessage: opts.throwMessage ?? '',
    }),
  );

  const env = { ...process.env, TZ: opts.tz ?? 'UTC', FAKE_WORLD_CONFIG: configFile, ...(opts.extraEnv ?? {}) };
  delete env.NODE_OPTIONS;
  delete env.GOOGLE_APPLICATION_CREDENTIALS;
  delete env.CULTIVATION_SNAPSHOT_READER_KEY;
  Object.assign(env, opts.extraEnv ?? {});
  const keyJson = opts.keyJson === undefined ? testKey().json : opts.keyJson;
  if (keyJson !== null) env.CULTIVATION_SNAPSHOT_READER_KEY = keyJson;

  const r = spawnSync(process.execPath, ['--import', pathToFileURL(PRELOAD).href, path.join(repo, 'scripts', 'fetch_shipment_forecast.mjs')], {
    cwd: repo,
    env,
    encoding: 'utf8',
    timeout: 60000,
  });
  const fetchLog = fs.existsSync(logFile)
    ? fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
    : [];
  return {
    code: r.status,
    signal: r.signal,
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
    output: `${r.stdout ?? ''}\n${r.stderr ?? ''}`,
    outText: fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : null,
    dataFiles: fs.readdirSync(dataDir).sort(),
    fetchLog,
    repo,
  };
}
