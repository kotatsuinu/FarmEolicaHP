// 鍵の組み立て（環境変数 → 認証の設定）。単独で試せる形にしてある（GA5・GA6）。
// 約束：CULTIVATION_SNAPSHOT_READER_KEY（サービスアカウントの鍵 JSON の文字列）だけを見る。
//   - 未設定・空なら ForecastStop('key_missing')。GOOGLE_APPLICATION_CREDENTIALS・メタデータサーバなど別の認証へ落ちない
//   - JSON でない／client_email・private_key が無い／秘密鍵として読めないなら ForecastStop('key_unreadable')
//   - 例外文・メッセージに鍵の中身（値）を含めない
// 戻り値：{ clientEmail, privateKey, tokenUri }
export function buildCredentials(env) {
  throw new Error('未実装');
}
