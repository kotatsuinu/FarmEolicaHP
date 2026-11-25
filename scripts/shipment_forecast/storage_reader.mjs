// 写しの読み出し口（保管庫の1ファイルを GET するだけ。Node 標準の crypto と fetch で作る）
// 約束：一覧は取らない・書き込みはしない。決め打ちの保管庫とパスだけを取る。
export const SNAPSHOT_BUCKET = 'fe-cultivation-snapshot';
export const SNAPSHOT_PATH = 'cultivation_snapshot/latest.json';

// 戻り値：{ readObject({ bucket, path }) }
//   readObject は { status, text, updated? } を返す。status 200＝取れた／404＝無い／401・403＝権限なし／その他＝通信の失敗扱い。
//   通信の例外はそのまま投げてよい（呼び出し側が fetch_failed にする）
export function createStorageReader({ credentials, fetchImpl = globalThis.fetch }) {
  throw new Error('未実装');
}
