// 止まった理由の種類（手で書いた一覧。実装の定数とは R0 で突き合わせる）
export const R = Object.freeze({
  keyMissing: 'key_missing',
  keyUnreadable: 'key_unreadable',
  notFound: 'snapshot_not_found',
  forbidden: 'snapshot_forbidden',
  fetchFailed: 'fetch_failed',
  jsonUnreadable: 'json_unreadable',
  versionUnknown: 'version_unknown',
  stale: 'snapshot_stale',
  datetimeUnreadable: 'datetime_unreadable',
  future: 'future_datetime',
  shapeInvalid: 'shape_invalid',
  zeroCultivations: 'zero_cultivations',
  requiredAllMissing: 'required_fields_missing_all',
  hiddenInvalid: 'hidden_list_invalid',
  writeFailed: 'write_failed',
  unexpected: 'unexpected_error',
});
export const ALL_REASONS = Object.values(R);
