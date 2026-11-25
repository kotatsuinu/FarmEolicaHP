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

// 署名つきの申し込み（JWT）を検証する：署名が正しく、iss が鍵のメールのときだけ true
export function verifyAssertion(assertion, publicKey, clientEmail) {
  const parts = String(assertion).split('.');
  if (parts.length !== 3) return false;
  const ok = crypto.verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), publicKey, Buffer.from(parts[2], 'base64url'));
  if (!ok) return false;
  const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  return claims.iss === clientEmail;
}
