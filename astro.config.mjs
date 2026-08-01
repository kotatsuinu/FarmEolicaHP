import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    tailwind(),
    sitemap({
      // /members は会員限定ページのため公開状態に関わらず常にsitemapから除外する。
      // /membership・/law/tokushoho は花信風メンバーシップの告知GO（環境変数
      // MEMBERSHIP_PUBLISHED=true）まで未公開のため、GOするまでは除外しておく。
      filter: (page) =>
        !page.includes('_template') &&
        !page.includes('/members') &&
        (process.env.MEMBERSHIP_PUBLISHED === 'true' ||
          (!page.includes('/membership') && !page.includes('/law/tokushoho'))),
    }),
  ],

  // サイト設定
  site: 'https://farmeolica.com',

  // ビルド設定
  output: 'static', // 静的サイト生成
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },

  // 画像最適化
  image: {
    remotePatterns: [{ protocol: "https" }],
  },
});
