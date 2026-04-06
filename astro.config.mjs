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
      filter: (page) => !page.includes('_template'),
    }),
  ],

  // サイト設定
  site: 'https://farm-eolica.com', // 本番環境のURLに変更してください

  // ビルド設定
  output: 'static', // 静的サイト生成

  // 画像最適化
  image: {
    remotePatterns: [{ protocol: "https" }],
  },
});
