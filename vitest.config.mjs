// テストの設定。3つの層に分ける（2026-11-25）。
//  scripts    : 出荷予報の書き出し部品（段1）。速い
//  page       : 出荷予報の画面の部品（段2）。速い（Astro の Container API）
//  page-build : 本物のビルドを回す層（段2）。遅い・重い。`npm run test:build` で単独に流す
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'scripts',
          include: ['tests/shipment_forecast/**/*.test.mjs'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'page',
          include: ['tests/shipment_forecast_page/**/*.test.mjs'],
          exclude: ['tests/shipment_forecast_page/build.test.mjs', '**/node_modules/**'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'page-build',
          include: ['tests/shipment_forecast_page/build.test.mjs'],
          environment: 'node',
          fileParallelism: false,
          testTimeout: 600000,
          hookTimeout: 600000,
        },
      },
      // en-build : 英語版（2026-11-27）。本物のビルドを1回回して日本語ページを段0の写しと突き合わせる。遅い・重い。
      //            page-build と同じ `npm run test:build` で流す。groupOrder で page-build の後に回し、2つのビルドを同時に走らせない
      {
        test: {
          name: 'en-build',
          include: ['tests/english_version/**/*.test.mjs'],
          environment: 'node',
          fileParallelism: false,
          testTimeout: 600000,
          hookTimeout: 600000,
          sequence: { groupOrder: 1 },
        },
      },
    ],
  },
});
