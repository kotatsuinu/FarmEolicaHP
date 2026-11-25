// 画面（段2）のテスト用の設定。Astro の部品を Container API で描くため、Astro の設定を通す。
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    name: 'page',
    include: ['tests/shipment_forecast_page/**/*.test.mjs'],
    exclude: ['tests/shipment_forecast_page/build.test.mjs', '**/node_modules/**'],
    environment: 'node',
  },
});
