// 出荷予報の書き出し部品：保管庫を読むための鍵の組み立て
// 見るのは環境変数 CULTIVATION_SNAPSHOT_READER_KEY（サービスアカウント鍵の JSON 文字列）だけ。
// 別の認証（GOOGLE_APPLICATION_CREDENTIALS・メタデータサーバ）へは落ちない。例外文に鍵の値を入れない
import crypto from 'node:crypto';
import { ForecastStop, STOP_REASONS } from './errors.mjs';
import { isFilledString, isObject } from './fields.mjs';

export const KEY_ENV_NAME = 'CULTIVATION_SNAPSHOT_READER_KEY';
export const DEFAULT_TOKEN_URI = 'https://oauth2.googleapis.com/token';

export function buildCredentials(env) {
  const raw = env?.[KEY_ENV_NAME];
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new ForecastStop(STOP_REASONS.key_missing, 'key_missing');
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ForecastStop(STOP_REASONS.key_unreadable, 'key_unreadable');
  }
  if (!isObject(parsed) || !isFilledString(parsed.client_email) || !isFilledString(parsed.private_key)) {
    throw new ForecastStop(STOP_REASONS.key_unreadable, 'key_unreadable');
  }
  try {
    crypto.createPrivateKey(parsed.private_key);
  } catch {
    throw new ForecastStop(STOP_REASONS.key_unreadable, 'key_unreadable');
  }
  return {
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key,
    tokenUri: isFilledString(parsed.token_uri) ? parsed.token_uri : DEFAULT_TOKEN_URI,
  };
}
