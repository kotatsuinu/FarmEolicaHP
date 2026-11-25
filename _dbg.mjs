import { getViteConfig } from 'astro/config';
import { createServer } from 'vite';
const cfg = await getViteConfig({}, { integrations: [] })({ command: 'serve', mode: 'test' });
try {
  const s = await createServer({ ...cfg, server: { ...(cfg.server||{}), middlewareMode: true }, configFile: false });
  console.log('server ok');
  const m = await s.ssrLoadModule('/src/components/forecast/ShipmentForecast.astro');
  console.log('loaded', Object.keys(m));
  await s.close();
} catch (e) { console.log('ERR', e?.message, e?.stack?.slice(0,1500), JSON.stringify(e, Object.getOwnPropertyNames(e)).slice(0,1500)); }
