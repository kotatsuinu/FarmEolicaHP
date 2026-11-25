// 出荷予報の書き出し部品：止まった理由の種類（段1の入れ物。値だけをここで決めている）
// 設計書 shipment_log_design.md §2.3 の番号との対応は shipment_log_stage1_tdd_record.md を参照
export const STOP_REASONS = Object.freeze({
  key_missing: 'key_missing', // 鍵（CULTIVATION_SNAPSHOT_READER_KEY）が無い・空
  key_unreadable: 'key_unreadable', // 鍵が読めない（JSONでない・必要な項目が無い・秘密鍵として読めない）
  snapshot_not_found: 'snapshot_not_found', // 写しが無い（404）
  snapshot_forbidden: 'snapshot_forbidden', // 権限が無い（401・403）
  fetch_failed: 'fetch_failed', // 通信の失敗（例外・その他の状態）
  json_unreadable: 'json_unreadable', // JSONとして読めない
  version_unknown: 'version_unknown', // snapshot_version が数の 1 でない
  snapshot_stale: 'snapshot_stale', // 作った日時から 36 時間を超えた
  datetime_unreadable: 'datetime_unreadable', // generated_at / generated_for_date が読めない
  future_datetime: 'future_datetime', // 作った日時が今より 5 分を超えて先
  shape_invalid: 'shape_invalid', // main・main.cultivations の形が違う
  zero_cultivations: 'zero_cultivations', // 主力の作付けが 0 件
  required_fields_missing_all: 'required_fields_missing_all', // 必須の項目が全作付けで空・欠落
  hidden_list_invalid: 'hidden_list_invalid', // 載せない一覧が無い・壊れている・番号が空欄
  write_failed: 'write_failed', // 書き出しに失敗した
  unexpected_error: 'unexpected_error', // 想定外の例外（検査が足りない印）
});

export class ForecastStop extends Error {
  constructor(reason, message = reason) {
    super(message);
    this.name = 'ForecastStop';
    this.reason = reason;
  }
}
