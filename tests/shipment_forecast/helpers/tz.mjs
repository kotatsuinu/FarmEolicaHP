// 時刻帯を切り替えて流す（手元の PC は日本時間・自動実行の環境は UTC。両方で同じ結果になることを確かめる）
import { test } from 'vitest';

export const TZS = ['UTC', 'Asia/Tokyo'];

export async function withTz(tz, fn) {
  const prev = process.env.TZ;
  process.env.TZ = tz;
  try {
    return await fn();
  } finally {
    if (prev === undefined) delete process.env.TZ;
    else process.env.TZ = prev;
  }
}

// 1つのテストを TZ=UTC と TZ=Asia/Tokyo の両方で登録する（名前の頭の番号はそのまま）
export function tzTest(name, fn, timeout) {
  for (const tz of TZS) {
    test(`${name} [TZ=${tz}]`, () => withTz(tz, fn), timeout);
  }
}
