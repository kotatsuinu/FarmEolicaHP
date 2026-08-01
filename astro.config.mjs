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
      // /members/ は会員限定ページのため、公開状態に関わらず常にsitemapから除外する。
      // /membership/・/law/tokushoho/ は花信風メンバーシップの告知GO（環境変数
      // MEMBERSHIP_PUBLISHED=true）まで未公開のため、GOするまでは除外しておく。
      // 注: /membership/ は文字列として /members を含むため、includes ではなく
      // pathname の前方一致で判定する（GO後も申込ページが除外され続ける事故を防ぐ）。
      filter: (page) => {
        let path;
        try {
          path = new URL(page).pathname;
        } catch {
          path = page;
        }
        if (path.includes('_template')) return false;
        if (path.startsWith('/members/')) return false;
        if (process.env.MEMBERSHIP_PUBLISHED !== 'true') {
          if (path.startsWith('/membership/') || path.startsWith('/law/tokushoho/')) return false;
        }
        return true;
      },
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
