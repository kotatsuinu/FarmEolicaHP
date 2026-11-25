// 段2 写真の対応表（実物）の検査（V13・V14）。実装の担当が写真をコピーして対応表を作る。
// 検査器は関数にして、壊れた手書きの表に対して「見つける」ことを先に確かめる（陽性コントロール）。
import { describe, test, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MAP_FILE = path.join(ROOT, 'src', 'data', 'shipment_forecast_photos.json');
const PUBLIC_DIR = path.join(ROOT, 'public');
const ALLOWED_PREFIX = '/images/forecast/';

// 対応表の1件（{src, alt}）の問題を数える
function checkEntry(entry, where, publicDir) {
  const bad = [];
  if (!entry || typeof entry !== 'object') return [`not_object@${where}`];
  const { src, alt } = entry;
  if (typeof src !== 'string' || src === '') return [`src_missing@${where}`];
  if (typeof alt !== 'string' || alt.trim() === '') bad.push(`alt_empty@${where}`);
  if (!src.startsWith(ALLOWED_PREFIX)) bad.push(`outside_forecast_dir:${src}@${where}`);
  if (src.includes('/images/instagram/')) bad.push(`instagram:${src}@${where}`);
  if (src.includes('..')) bad.push(`dotdot:${src}@${where}`);
  // 大文字小文字まで一致で確かめる（Windows の existsSync は区別しないが、本番の Linux は区別して無言の404になる）
  const onDisk = path.join(publicDir, src.replace(/^\//, ''));
  let exact = false;
  try {
    exact = fs.readdirSync(path.dirname(onDisk)).includes(path.basename(onDisk)) && fs.statSync(onDisk).isFile();
  } catch {
    exact = false;
  }
  if (!exact) bad.push(`missing_file:${src}@${where}`);
  return bad;
}
export function checkPhotoMap(map, publicDir) {
  const bad = [];
  if (!map || typeof map !== 'object' || !map.crops || typeof map.crops !== 'object') return ['no_crops'];
  const names = Object.keys(map.crops);
  if (names.length < 1) bad.push('zero_entries');
  for (const crop of names) {
    const e = map.crops[crop];
    bad.push(...checkEntry(e, `crop:${crop}`, publicDir));
    for (const k of Object.keys(e ?? {})) if (!['src', 'alt', 'varieties'].includes(k)) bad.push(`extra_key:${k}@crop:${crop}`);
    if (e && e.varieties !== undefined) {
      if (typeof e.varieties !== 'object' || e.varieties === null || Array.isArray(e.varieties)) bad.push(`varieties_shape@crop:${crop}`);
      else for (const [v, ve] of Object.entries(e.varieties)) bad.push(...checkEntry(ve, `variety:${crop}/${v}`, publicDir));
    }
  }
  return bad;
}

describe('検査器そのもの（壊れた表を見つけられる）', () => {
  test('PC-1 0件・instagram・forecast 外・実在しないファイル・alt なしを、それぞれ見つける', () => {
    expect(checkPhotoMap({ crops: {} }, PUBLIC_DIR)).toContain('zero_entries');
    const bad = checkPhotoMap(
      {
        crops: {
          あ: { src: '/images/instagram/01.jpg', alt: 'x' },
          い: { src: '/images/forecast/__none__.jpg', alt: 'x' },
          う: { src: '/images/top/a.jpg', alt: 'x' },
          え: { src: '/images/forecast/__none2__.jpg', alt: '' },
        },
      },
      PUBLIC_DIR,
    );
    expect(bad.some((b) => b.startsWith('instagram:'))).toBe(true);
    expect(bad.some((b) => b.startsWith('missing_file:/images/forecast/__none__.jpg'))).toBe(true);
    expect(bad.some((b) => b.startsWith('outside_forecast_dir:/images/top/a.jpg'))).toBe(true);
    expect(bad.some((b) => b.startsWith('alt_empty@crop:え'))).toBe(true);
  });
  test('PC-3 大文字小文字だけ違う指し先は「実在しない」とみなす（実ファイル stock.jpg・表は Stock.jpg）', () => {
    const fakePublic = fs.mkdtempSync(path.join(os.tmpdir(), 'sfp-pub-'));
    fs.mkdirSync(path.join(fakePublic, 'images', 'forecast'), { recursive: true });
    fs.writeFileSync(path.join(fakePublic, 'images', 'forecast', 'stock.jpg'), 'x');
    try {
      const wrongCase = checkPhotoMap({ crops: { ストック: { src: '/images/forecast/Stock.jpg', alt: 'a' } } }, fakePublic);
      expect(wrongCase.some((b) => b.startsWith('missing_file:/images/forecast/Stock.jpg'))).toBe(true);
      const rightCase = checkPhotoMap({ crops: { ストック: { src: '/images/forecast/stock.jpg', alt: 'a' } } }, fakePublic);
      expect(rightCase).toEqual([]);
    } finally {
      fs.rmSync(fakePublic, { recursive: true, force: true });
    }
  });

  test('PC-2 正しい表（実在のファイルを指す）は問題0件', () => {
    // この検査の陰性側。一時の公開フォルダに forecast 配下のファイルを置いて確かめる
    const fakePublic = fs.mkdtempSync(path.join(os.tmpdir(), 'sfp-pub-'));
    fs.mkdirSync(path.join(fakePublic, 'images', 'forecast'), { recursive: true });
    fs.writeFileSync(path.join(fakePublic, 'images', 'forecast', 'ok.jpg'), 'x');
    try {
      expect(
        checkPhotoMap(
          { crops: { ストック: { src: '/images/forecast/ok.jpg', alt: 'ストック', varieties: { ホワイト: { src: '/images/forecast/ok.jpg', alt: 'ホワイト' } } } } },
          fakePublic,
        ),
      ).toEqual([]);
    } finally {
      fs.rmSync(fakePublic, { recursive: true, force: true });
    }
  });
});

describe('実物の対応表', () => {
  test('V14-0 対応表のファイルがある', () => {
    expect(fs.existsSync(MAP_FILE)).toBe(true);
  });

  test('V13/V14 1件以上あり、全部 /images/forecast/ 配下・public に実在・Instagram を指さない・alt あり', () => {
    const map = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
    expect(Object.keys(map.crops).length).toBeGreaterThanOrEqual(1);
    expect(checkPhotoMap(map, PUBLIC_DIR)).toEqual([]);
  });

  test('V14-2 「ストック」の品目がある（実際の主力品目。0件・別の表で緑にならない）', () => {
    const map = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
    expect(Object.keys(map.crops)).toContain('ストック');
  });

  test('V13-2 文字列として /images/instagram/ がファイルのどこにも出ない', () => {
    const text = fs.readFileSync(MAP_FILE, 'utf8');
    expect(text).not.toContain('/images/instagram/');
  });
});
