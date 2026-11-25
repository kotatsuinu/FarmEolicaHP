// 出荷予報の書き出し部品：保管庫の1ファイルを読むだけの読み出し口（書き込み・一覧は持たない）
// 署名つきの申し込み（RS256 の JWT）→ トークン → 1ファイルの GET。Node 標準の crypto と fetch だけ
import crypto from 'node:crypto';

export const SNAPSHOT_BUCKET = 'fe-cultivation-snapshot';
export const SNAPSHOT_PATH = 'cultivation_snapshot/latest.json';

const SCOPE = 'https://www.googleapis.com/auth/devstorage.read_only';
const GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:jwt-bearer';
const STORAGE_HOST = 'https://storage.googleapis.com';

const b64url = (value) => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');

function signedAssertion({ clientEmail, privateKey, tokenUri }) {
  const iat = Math.floor(Date.now() / 1000);
  const header = b64url({ alg: 'RS256', typ: 'JWT' });
  const claims = b64url({ iss: clientEmail, scope: SCOPE, aud: tokenUri, iat, exp: iat + 3600 });
  const signature = crypto.sign('RSA-SHA256', Buffer.from(`${header}.${claims}`), privateKey).toString('base64url');
  return `${header}.${claims}.${signature}`;
}

// 状態（404・403 など）はそのまま返し、通信の例外は投げる（理由は呼び出し側が決める）
export function createStorageReader({ credentials, fetchImpl }) {
  const doFetch = fetchImpl ?? ((...args) => globalThis.fetch(...args));

  async function getToken() {
    const body = new URLSearchParams({ grant_type: GRANT_TYPE, assertion: signedAssertion(credentials) }).toString();
    const res = await doFetch(credentials.tokenUri, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (res.status !== 200) return { status: res.status === 400 || res.status === 401 || res.status === 403 ? 401 : 500 };
    const json = await res.json();
    if (typeof json?.access_token !== 'string' || json.access_token === '') return { status: 500 };
    return { token: json.access_token };
  }

  return {
    async readObject({ bucket, path }) {
      const t = await getToken();
      if (t.token === undefined) return { status: t.status, text: '' };
      const url = `${STORAGE_HOST}/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(path)}?alt=media`;
      const res = await doFetch(url, { method: 'GET', headers: { Authorization: `Bearer ${t.token}` } });
      if (res.status !== 200) return { status: res.status, text: '' };
      const text = await res.text();
      const updated = res.headers?.get?.('last-modified') ?? undefined;
      return updated ? { status: 200, text, updated } : { status: 200, text };
    },
  };
}
