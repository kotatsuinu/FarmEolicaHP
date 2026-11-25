// .astro の部品を Container API で描くための土台。
// このリポジトリでは vitest が使う vite が 5.4（トップ）で、Astro 5.16 の vite プラグインは vite 6 の
// 機能（this.environment）を使うため、vitest の設定に Astro を載せる形（getViteConfig）が動かない
// （実測：「Cannot read properties of undefined (reading 'name')」）。
// そこで Astro が自分で持っている vite 6 を直接使い、部品を読み込む小さな開発用サーバをテストの中で立てる。
// （依存パッケージは足さない。vitest 側の vite を 6 に上げる案は親の判断待ち＝記録 ⑤）
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { getViteConfig } from 'astro/config';

const req = createRequire(import.meta.url);
const astroReq = createRequire(req.resolve('astro/package.json'));
const { createServer } = await import(pathToFileURL(astroReq.resolve('vite')).href);

let server;
export async function loadAstroComponent(urlPath) {
  if (!server) {
    const cfg = await getViteConfig({}, { integrations: [] })({ command: 'serve', mode: 'test' });
    server = await createServer({
      ...cfg,
      configFile: false,
      appType: 'custom',
      logLevel: 'error',
      server: { middlewareMode: true, hmr: false, watch: null },
    });
  }
  const mod = await server.ssrLoadModule(urlPath);
  return mod.default;
}
export async function closeAstro() {
  const s = server;
  server = undefined;
  if (s) await s.close();
}
export async function renderComponent(urlPath, props) {
  const Component = await loadAstroComponent(urlPath);
  const container = await AstroContainer.create();
  return container.renderToString(Component, { props });
}
