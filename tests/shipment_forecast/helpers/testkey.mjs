// テスト用の鍵（実行のたびにその場で作る。リポジトリには鍵の文字列を置かない）
import crypto from 'node:crypto';

let cached = null;
export function testKey() {
  if (cached) return cached;
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const clientEmail = 'KEYMARK-reader@example.test';
  const tokenUri = 'https://oauth2.googleapis.com/token';
  const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  cached = {
    clientEmail,
    tokenUri,
    publicKey,
    privatePem,
    json: JSON.stringify({ type: 'service_account', client_email: clientEmail, private_key: privatePem, token_uri: tokenUri }),
  };
  return cached;
}

export const JWT_BEARER = 'urn:ietf:params:oauth:grant-type:jwt-bearer';

// 署名つきの申し込み（JWT）を作る（検査器の確かめ用。header・claims は上書きできる）
export function signJwt({ privateKeyPem, header = {}, claims = {} }) {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const h = enc({ alg: 'RS256', typ: 'JWT', ...header });
  const c = enc(claims);
  const sig = crypto.sign('RSA-SHA256', Buffer.from(`${h}.${c}`), privateKeyPem).toString('base64url');
  return `${h}.${c}.${sig}`;
}

// トークンの申し込みを検査する（偽の読み出し口・偽の世界の両方が使う）。次のすべてを満たすときだけ true
//  POST／grant_type が jwt-bearer／alg が RS256／署名が正しい／iss＝鍵のメール／aud＝トークンの URL／
//  scope に devstorage.read_only を含み、書き込み用の範囲を含まない／exp が iat より後
export function verifyTokenRequest({ method, body, publicKey, clientEmail, tokenUri }) {
  try {
    if (String(method).toUpperCase() !== 'POST') return false;
    const raw = typeof body === 'string' ? body : String(body ?? '');
    let params = Object.fromEntries(new URLSearchParams(raw));
    if (!params.assertion) {
      try {
        params = JSON.parse(raw);
      } catch {
        params = {};
      }
    }
    if (params.grant_type !== JWT_BEARER) return false;
    const parts = String(params.assertion ?? '').split('.');
    if (parts.length !== 3) return false;
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if (header.alg !== 'RS256') return false;
    const ok = crypto.verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), publicKey, Buffer.from(parts[2], 'base64url'));
    if (!ok) return false;
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (claims.iss !== clientEmail || claims.aud !== tokenUri) return false;
    const scope = String(claims.scope ?? '');
    if (!scope.includes('devstorage.read_only') || /read_write|full_control/.test(scope)) return false;
    return Number.isFinite(claims.iat) && Number.isFinite(claims.exp) && claims.exp > claims.iat;
  } catch {
    return false;
  }
}

// 1ファイルの取得の URL か（一覧・メタデータだけの URL は赤）。問題があれば文字、無ければ null
// JSON API：/storage/v1/b/<bucket>/o/<エンコード済みパス>?alt=media（/download/ 付きも可）／XML API：/<bucket>/<パス>
export function singleObjectUrlProblem(url, bucket, objectPath) {
  const u = new URL(String(url));
  const m = /^\/(?:download\/)?storage\/v1\/b\/([^/]+)\/o(?:\/(.*))?$/.exec(u.pathname);
  if (m) {
    if (m[1] !== bucket) return 'bucket';
    if (!m[2]) return 'list';
    if (decodeURIComponent(m[2]) !== objectPath) return 'path';
    if (u.searchParams.get('alt') !== 'media') return 'no_alt_media';
    return null;
  }
  if (decodeURIComponent(u.pathname) === `/${bucket}/${objectPath}`) return null;
  return 'shape';
}
