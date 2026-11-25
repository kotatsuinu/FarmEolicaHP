// テストの設定（出荷予報の書き出し部品から使い始めた。2026-11-25）
// テストは tests/ の下に *.test.mjs で置く。実行は `npm test`（重い処理の札の対象）
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.mjs'],
    environment: 'node',
  },
});
