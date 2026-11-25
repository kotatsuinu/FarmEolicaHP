// 段2 表示部品（ShipmentForecast.astro）を Astro の Container API で描いて確かめる。
// 入力は「表示用の形」を手で書いたもの（view.ts を通さない＝部品だけを確かめる）。
import { describe, test, expect, afterAll } from 'vitest';
import { renderComponent, closeAstro } from './helpers/astro_container.mjs';
import { countAttr, LEAK } from './helpers/builders.mjs';

const COMPONENT = '/src/components/forecast/ShipmentForecast.astro';
afterAll(closeAstro);

const GEN = '2026-11-13T04:30:00+09:00';
const ASOF = '11月13日 朝の時点';
const NOTE = '植えた本数の目安です。出荷できる本数や、品質をお約束する本数ではありません';
const EMPTY_TEXT = 'いま載せられる品目はありません。出荷の見込みはお問い合わせください';
const PHOTO_NOTE = '過去の栽培のイメージです';

const render = (view) => renderComponent(COMPONENT, { view });
const count = (html, needle) => html.split(needle).length - 1;
const vRow = (over = {}) => ({ variety: 'テスト品種', months: '12月〜2027年1月', statusLabel: '生育中', countLabel: '約1千本', ...over });
const vItem = (crop, rows, over = {}) => ({ crop, photo: null, contactHref: '/contact', rows, ...over });
const vSection = (key, items) => ({ key, title: { shipping: '出荷中', soon: 'もうすぐ', later: 'これから' }[key], items });
const present = (sections) => ({ state: 'present', asOf: ASOF, generatedAt: GEN, sections });

describe('Container API の土台', () => {
  // 最初の1件で開発用サーバを起動して部品を読み込む。重い処理の順番待ちで遅れても誤報にしない
  test('R-0 健全性：入れ物の部品を Container で描ける（例外にならず文字列が返る）', async () => {
    const html = await render({ state: 'missing' });
    expect(typeof html).toBe('string');
  }, 120000);
});

describe('3つの状態（V1）', () => {
  test('V1-missing 「出荷予報を準備しています」だけ。区分も注意書きも出さない', async () => {
    const html = await render({ state: 'missing' });
    expect(html).toContain('data-forecast-state="missing"');
    expect(html).toContain('出荷予報を準備しています');
    expect(countAttr(html, 'data-section')).toBe(0);
    expect(html).not.toContain(NOTE);
    expect(html).not.toContain('朝の時点');
  });

  test('V1-empty 見出し・日付・0件の文言。本数の注意書きは出さない', async () => {
    const html = await render({ state: 'empty', asOf: ASOF, generatedAt: GEN });
    expect(html).toContain('data-forecast-state="empty"');
    expect(html).toMatch(/<h[12][^>]*>[^<]*出荷予報/);
    expect(html).toContain(ASOF);
    expect(html).toContain(EMPTY_TEXT);
    expect(countAttr(html, 'data-section')).toBe(0);
    expect(html).not.toContain(NOTE);
    expect(html).not.toContain('出荷予報を準備しています');
  });

  test('V1-present 見出し・日付→区分→注意書き→問い合わせ の順（注意書きは1回だけ）', async () => {
    const html = await render(
      present([
        vSection('shipping', [vItem('ストック', [vRow({ statusLabel: '収穫中' })])]),
        vSection('soon', [vItem('ダリア', [vRow()])]),
        vSection('later', [vItem('ヒマワリ', [vRow()])]),
      ]),
    );
    expect(html).toContain('data-forecast-state="present"');
    expect(html).toMatch(/<h[12][^>]*>[^<]*出荷予報/);
    expect(html).not.toContain('出荷予報を準備しています');
    expect(html).not.toContain(EMPTY_TEXT);
    const iAsOf = html.indexOf(ASOF);
    const iShipping = html.indexOf('出荷中');
    const iSoon = html.indexOf('もうすぐ');
    const iLater = html.indexOf('これから');
    const iNote = html.indexOf(NOTE);
    expect(iAsOf).toBeGreaterThan(-1);
    expect(iAsOf).toBeLessThan(iShipping);
    expect(iShipping).toBeLessThan(iSoon);
    expect(iSoon).toBeLessThan(iLater);
    expect(iLater).toBeLessThan(iNote);
    expect(count(html, NOTE)).toBe(1);
    // 注意書きの前に、品目ごとの問い合わせがすべて出ている／注意書きの後に問い合わせへのリンクがある
    expect(html.lastIndexOf('この品目を問い合わせる')).toBeLessThan(iNote);
    expect(html.slice(iNote)).toMatch(/href="\/contact"/);
  });

  test('V2-目印 区分の目印が順に出て、数は区分の数と同じ', async () => {
    const html = await render(
      present([
        vSection('shipping', [vItem('ストック', [vRow()])]),
        vSection('later', [vItem('ヒマワリ', [vRow()])]),
      ]),
    );
    const marks = [...html.matchAll(/data-section="([a-z]+)"/g)].map((m) => m[1]);
    expect(marks).toEqual(['shipping', 'later']);
    expect(html).not.toContain('もうすぐ');
  });
});

describe('品目・行の描き方', () => {
  test('V4 品種なし・本数なしの欄は出ない。「null」「undefined」「NaN」「約」だけが出ない', async () => {
    const html = await render(
      present([
        vSection('soon', [
          vItem('ストック', [vRow({ variety: null, countLabel: null }), vRow({ variety: 'あ', countLabel: '約1千本' })]),
        ]),
      ]),
    );
    expect(html).not.toMatch(/null|undefined|NaN/);
    expect(html).not.toMatch(/>\s*約\s*</);
    expect(countAttr(html, 'data-row')).toBe(2);
    expect(html).toContain('約1千本');
    expect(count(html, '約1千本')).toBe(1);
    expect(html).toContain('12月〜2027年1月');
  });

  test('V4-3 品種なし・本数なしの行の中身は「月＋状態の札」だけ（空の見出しや欄が残らない）', async () => {
    const html = await render(
      present([
        vSection('soon', [
          vItem('ストック', [
            vRow({ variety: null, countLabel: null }),
            vRow({ variety: 'あ', countLabel: null, months: '1月から' }),
            vRow({ variety: null, countLabel: '約1千本', months: '2月から' }),
            vRow({ variety: 'い', countLabel: '約2千本', months: '3月から' }),
          ]),
        ]),
      ]),
    );
    // data-row ごとの中身（開始タグの終わりから次の data-row の直前まで）をタグを外した文字にする
    const parts = html.split(/data-row(?=[\s=>/])/).slice(1);
    expect(parts).toHaveLength(4);
    const texts = parts.map((seg) =>
      seg
        .slice(seg.indexOf('>') + 1)
        .replace(/<[^>]*$/, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    );
    const rest = (text, known) => known.reduce((t, k) => t.replace(k, ''), text).replace(/\s+/g, '').trim();
    expect(rest(texts[0], ['12月〜2027年1月', '生育中'])).toBe('');
    expect(rest(texts[1], ['1月から', '生育中', 'あ'])).toBe('');
    expect(rest(texts[2], ['2月から', '生育中', '約1千本'])).toBe('');
    // 最後の行の後ろには区分の外の文字（注意書き・問い合わせ）が続くので、行の頭だけ確かめる
    expect(texts[3].startsWith('い') || texts[3].includes('い')).toBe(true);
  });

  test('V4-2 全部の行で品種・本数なしでも、月と状態の札は出る', async () => {
    const html = await render(
      present([vSection('soon', [vItem('ストック', [vRow({ variety: null, countLabel: null })])])]),
    );
    expect(html).toContain('12月〜2027年1月');
    expect(html).toContain('生育中');
    expect(html).not.toMatch(/null|undefined|NaN/);
  });

  test('V5 状態の札：渡された文言がそのまま出て、行ごと・品目ごとの目印の数が合う', async () => {
    const labels = ['育苗・植え付け前', '生育中', 'つぼみ', '収穫中'];
    const html = await render(
      present([
        vSection('soon', [
          vItem('ストック', labels.slice(0, 3).map((l, i) => vRow({ variety: `品種${i}`, statusLabel: l }))),
          vItem('ダリア', [vRow({ statusLabel: labels[3] })]),
        ]),
      ]),
    );
    for (const l of labels) expect(count(html, l)).toBe(1);
    expect(countAttr(html, 'data-crop')).toBe(2);
    expect(countAttr(html, 'data-row')).toBe(4);
  });

  test('V11 「この品目を問い合わせる」が品目ごとに1つで、どれも href が /contact（品目名を付けない）', async () => {
    const html = await render(
      present([
        vSection('soon', [vItem('カンパニュラ・メディウム', [vRow()]), vItem('A&B', [vRow()]), vItem('空 白', [vRow()])]),
        vSection('later', [vItem('ストック', [vRow()])]),
      ]),
    );
    expect(count(html, 'この品目を問い合わせる')).toBe(4);
    const links = [...html.matchAll(/<a\b[^>]*\bhref="\/contact"[^>]*>\s*(?:<[^>]+>\s*)*この品目を問い合わせる/g)];
    expect(links).toHaveLength(4);
    expect(html).not.toMatch(/href="\/contact[?#]/);
  });

  test('V12 写真：ある品目だけ img と「過去の栽培のイメージです」。無い品目には出ない', async () => {
    const photo = { src: '/images/forecast/stock.jpg', alt: 'ストックの写真' };
    const html = await render(
      present([vSection('soon', [vItem('ストック', [vRow()], { photo }), vItem('ダリア', [vRow()])])]),
    );
    expect(count(html, '<img')).toBe(1);
    expect(html).toContain('src="/images/forecast/stock.jpg"');
    expect(html).toContain('alt="ストックの写真"');
    expect(count(html, PHOTO_NOTE)).toBe(1);
  });

  test('V12-2 写真が1枚も無いと img も「過去の栽培のイメージです」も出ない', async () => {
    const html = await render(present([vSection('soon', [vItem('ダリア', [vRow()])])]));
    expect(html).not.toContain('<img');
    expect(html).not.toContain(PHOTO_NOTE);
    expect(html).not.toMatch(/alt=""/);
  });

  test('V12-3 写真のある品目が2つなら、注意書きも2つ', async () => {
    const mk = (n) => ({ src: `/images/forecast/${n}.jpg`, alt: `${n}の写真` });
    const html = await render(
      present([
        vSection('soon', [vItem('ストック', [vRow()], { photo: mk('a') })]),
        vSection('later', [vItem('ダリア', [vRow()], { photo: mk('b') })]),
      ]),
    );
    expect(count(html, '<img')).toBe(2);
    expect(count(html, PHOTO_NOTE)).toBe(2);
  });

  test('V16 品目名・品種名・写真の説明の `<script>`・`&`・`"` はエスケープされる', async () => {
    const html = await render(
      present([
        vSection('soon', [
          vItem('<script>alert(1)</script>', [vRow({ variety: 'A&B "q"' })], {
            photo: { src: '/images/forecast/x.jpg', alt: 'a" onerror="x' },
          }),
        ]),
      ]),
    );
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('A&amp;B');
    expect(html).not.toContain('A&B "q"');
    expect(html).not.toMatch(/alt="a" onerror="x"/);
    // 写真は実際に描かれ、説明の引用符はエスケープされている
    expect(countAttr(html, '<img'.slice(1))).toBeGreaterThanOrEqual(0);
    expect(count(html, '<img')).toBe(1);
    expect(html).toContain('alt="a&quot; onerror=&quot;x"');
  });

  test('N-1 表示用の形に無い項目（最上位・区分・品目・行・写真の各階層）は出さない：目印が0件', async () => {
    const mk = (n) => ({ ...vRow(), cultivation_no: LEAK.strings[0], planned_count: LEAK.numbers[0], stage_name: LEAK.strings[2], memo: n });
    const view = {
      ...present([
        {
          ...vSection('soon', [
            {
              ...vItem('ストック', [mk(LEAK.strings[4])], { photo: { src: '/images/forecast/a.jpg', alt: 'a', bed: LEAK.strings[5] } }),
              user_id: LEAK.strings[6],
              note: LEAK.strings[3],
            },
          ]),
          section_memo: LEAK.strings[1],
        },
      ]),
      owner: LEAK.strings[6],
      raw_count: LEAK.numbers[1],
    };
    const html = await render(view);
    expect(html).toContain('data-crop');
    for (const m of LEAK.strings) expect(html, m).not.toContain(m);
    for (const n of LEAK.numbers) expect(html.match(new RegExp(`(?<![0-9.])${n}(?![0-9])`)), String(n)).toBeNull();
  });
});
