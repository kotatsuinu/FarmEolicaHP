// 入口（scripts/fetch_shipment_forecast.mjs）を本物のまま起動するときの「偽の世界」。node --import で先に読み込む。
// ・時計を固定する（new Date()・Date.now() が設定の日時になる）
// ・fetch を差し替える：トークンの申し込み（署名つき）と、決め打ちの保管庫・パスの GET にだけ答える。それ以外は「無い」。呼び出しは全部ログに残す
// 設定は環境変数 FAKE_WORLD_CONFIG のファイル（JSON）：{ nowIso, snapshotFile, mode, publicPem, clientEmail, tokenUri, logFile, throwMessage }
import crypto from 'node:crypto';
import fs from 'node:fs';
import { singleObjectUrlProblem, verifyTokenRequest } from './testkey.mjs';

const cfg = JSON.parse(fs.readFileSync(process.env.FAKE_WORLD_CONFIG, 'utf8'));

const RealDate = Date;
const FIXED = new RealDate(cfg.nowIso).getTime();
class FakeDate extends RealDate {
  constructor(...args) {
    if (args.length === 0) super(FIXED);
    else super(...args);
  }
  static now() {
    return FIXED;
  }
}
globalThis.Date = FakeDate;

const BUCKET = 'fe-cultivation-snapshot';
const OBJECT = 'cultivation_snapshot/latest.json';
const log = (entry) => fs.appendFileSync(cfg.logFile, `${JSON.stringify(entry)}\n`);

// 保管庫への URL を (bucket, object) に分ける。object が無ければ一覧の呼び出し
function parseStorageUrl(u) {
  const segs = u.pathname.split('/').filter(Boolean);
  const bi = segs.indexOf('b');
  if (bi >= 0 && segs[bi + 2] === 'o') {
    // JSON API（/storage/v1/b/<bucket>/o/<object>、/download/storage/v1/b/... も同じ形）
    return { bucket: segs[bi + 1], object: segs[bi + 3] ? decodeURIComponent(segs.slice(bi + 3).join('/')) : null };
  }
  // XML API（/<bucket>/<object>）
  return { bucket: segs[0] ?? null, object: segs.length > 1 ? decodeURIComponent(segs.slice(1).join('/')) : null };
}

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input instanceof Request ? input.url : input));
  const method = (init.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const headers = new Headers(init.headers ?? (input instanceof Request ? input.headers : {}));
  const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  if (url.hostname === 'oauth2.googleapis.com') {
    const ok = verifyTokenRequest({ method, body: init.body, publicKey: crypto.createPublicKey(cfg.publicPem), clientEmail: cfg.clientEmail, tokenUri: cfg.tokenUri });
    log({ kind: 'token', method, ok });
    return ok ? json(200, { access_token: 'fake-access-token', expires_in: 3600, token_type: 'Bearer' }) : json(401, { error: 'invalid_grant' });
  }

  if (url.hostname === 'storage.googleapis.com') {
    const { bucket, object } = parseStorageUrl(url);
    if (object === null) {
      log({ kind: 'list', method, path: url.pathname });
      return json(404, { error: 'not found' });
    }
    log({ kind: bucket === BUCKET && object === OBJECT ? 'object' : 'other_object', method, bucket, object });
    if (bucket !== BUCKET || object !== OBJECT) return json(404, { error: 'not found' });
    if (method !== 'GET') return json(405, { error: 'method not allowed' });
    if (headers.get('authorization') !== 'Bearer fake-access-token') return json(401, { error: 'unauthorized' });
    // JSON API で alt=media が無いと、本物は中身ではなくメタデータの JSON を返す
    if (singleObjectUrlProblem(url.href, BUCKET, OBJECT) === 'no_alt_media') return json(200, { kind: 'storage#object', name: OBJECT });
    if (cfg.mode === 'throw') throw new TypeError(`fetch failed ${cfg.throwMessage}`);
    if (String(cfg.mode).startsWith('status:')) return json(Number(String(cfg.mode).slice(7)), { error: 'forced' });
    return new Response(fs.readFileSync(cfg.snapshotFile, 'utf8'), { status: 200, headers: { 'content-type': 'application/json' } });
  }

  // メタデータサーバなど、決め打ち以外への問い合わせ（別の認証に落ちた印）
  log({ kind: 'other_host', method, host: url.hostname, path: url.pathname });
  return json(404, { error: 'not found' });
};
