// 出荷予報 段3：毎朝の自動実行（.github/workflows/shipment_forecast_sync.yml）の「形の確かめ」A1〜A7・A13
// ※ ここは書き方を読んで確かめるだけ。実際に動くことの証明ではない（実走 A8〜A10 は鍵ができてから）
// 実物を読むテストは、ファイルが無ければ赤になる（飛ばさない・緑にしない）。
// 道具が空振りしないことの確認（陽性コントロール）：約束を破った合成の文字列で「破っている」と出るか・見本で「破っていない」と出るか
import fs from 'node:fs';
import { describe, expect, test } from 'vitest';
import {
  EXPECTED_CRON,
  INSTAGRAM_WORKFLOW_PATH,
  checkFailureNotSwallowed,
  checkGitAdd,
  checkNoDiffBranch,
  checkPermissionsAndCheckout,
  checkPush,
  checkReadOnly,
  checkSecrets,
  checkStepOrder,
  checkTriggers,
  readPartFiles,
  readWorkflowText,
} from './helpers/workflow_shape.mjs';

// 約束どおりの見本（道具の確認用。本物のワークフローの写しではなく、約束を文字にしたもの）
const GOOD = `name: Shipment Forecast Sync

on:
  schedule:
    - cron: '30 19 * * *'
  workflow_dispatch:

permissions:
  contents: write

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v7
        with:
          ref: main

      - name: Setup Node.js
        uses: actions/setup-node@v7
        with:
          node-version: 24

      - name: Fetch shipment forecast
        env:
          CULTIVATION_SNAPSHOT_READER_KEY: \${{ secrets.CULTIVATION_SNAPSHOT_READER_KEY }}
        run: node scripts/fetch_shipment_forecast.mjs

      - name: Commit and push changes
        run: |
          git config user.name 'github-actions[bot]'
          git config user.email 'github-actions[bot]@users.noreply.github.com'
          git add src/data/shipment_forecast.json
          if git diff --cached --quiet; then
            echo "No changes to commit"
          else
            git commit -m 'Update shipment forecast'
            git push origin main
          fi
`;

const mutate = (from, to) => {
  expect(GOOD.includes(from), `見本に "${from}" が無い（テストの書き間違い）`).toBe(true);
  return GOOD.replace(from, to);
};

describe('陽性コントロール：道具が約束違反を見逃さない（見本は通り、破った文字列は引っかかる）', () => {
  test('見本は全部の検査を通る（両側の片方：破っていない）', () => {
    expect(checkTriggers(GOOD, { forbiddenCron: '0 18 * * *' })).toEqual([]);
    expect(checkPermissionsAndCheckout(GOOD)).toEqual([]);
    expect(checkFailureNotSwallowed(GOOD)).toEqual([]);
    expect(checkGitAdd(GOOD)).toEqual([]);
    expect(checkNoDiffBranch(GOOD)).toEqual([]);
    expect(checkSecrets(GOOD)).toEqual([]);
    expect(checkPush(GOOD)).toEqual([]);
    expect(checkStepOrder(GOOD)).toEqual([]);
  });

  test('点検で足した穴：run の || 全面禁止・git の前置き選択肢・順序・shell・run: >・SECRETS 大文字・--staged と引用符は緑', () => {
    const addRun = (line) => mutate('          git config user.name', `          ${line}\n          git config user.name`);
    // 1. run の中の || は何でも赤（|| : も当たる）
    expect(checkFailureNotSwallowed(mutate('git push origin main', 'git push origin main || echo failed')).length).toBeGreaterThan(0);
    expect(checkFailureNotSwallowed(mutate('run: node scripts/fetch_shipment_forecast.mjs', 'run: node scripts/fetch_shipment_forecast.mjs || :')).length).toBeGreaterThan(0);
    // 2. git -c / -C は赤（push --force を隠せる）
    expect(checkPush(mutate('git push origin main', 'git -c x=y push --force origin main')).length).toBeGreaterThan(0);
    expect(checkPush(addRun('git -C . reset --hard')).length).toBeGreaterThan(0);
    expect(checkGitAdd(mutate('git add src/data/shipment_forecast.json', 'git -c x=y add -A')).length).toBeGreaterThan(0);
    // 3. 順序
    const diffFirst = GOOD.replace('          git add src/data/shipment_forecast.json\n', '').replace('          if git diff --cached --quiet; then', '          if git diff --cached --quiet; then').replace("          git config user.name 'github-actions[bot]'\n", "          git config user.name 'github-actions[bot]'\n          git diff --cached --quiet\n          git add src/data/shipment_forecast.json\n");
    expect(checkStepOrder(diffFirst).length).toBeGreaterThan(0);
    const commitBeforeDiff = mutate("          git add src/data/shipment_forecast.json\n", "          git add src/data/shipment_forecast.json\n          git commit -m 'early'\n");
    expect(checkStepOrder(commitBeforeDiff).length).toBeGreaterThan(0);
    const addBeforePart = mutate('        run: node scripts/fetch_shipment_forecast.mjs', '        run: |\n          git add src/data/shipment_forecast.json\n          node scripts/fetch_shipment_forecast.mjs');
    expect(checkStepOrder(addBeforePart).length).toBeGreaterThan(0);
    // 4. shell:
    expect(checkFailureNotSwallowed(mutate('        run: node scripts/fetch_shipment_forecast.mjs', '        shell: bash {0}\n        run: node scripts/fetch_shipment_forecast.mjs')).length).toBeGreaterThan(0);
    // 5. SECRETS（大文字小文字を区別しない）
    expect(checkSecrets(addRun('echo ${{ SECRETS.OTHER }}')).length).toBeGreaterThan(0);
    // 6. run: >
    expect(checkFailureNotSwallowed(mutate('run: node scripts/fetch_shipment_forecast.mjs', 'run: >\n          node scripts/fetch_shipment_forecast.mjs')).length).toBeGreaterThan(0);
    // 7. --staged は正しい形（緑）
    const staged = mutate('git diff --cached --quiet', 'git diff --staged --quiet');
    expect(checkNoDiffBranch(staged)).toEqual([]);
    expect(checkStepOrder(staged)).toEqual([]);
    // 8. git add の引数の引用符は外して比べる（緑）・別のファイルは引用符付きでも赤
    expect(checkGitAdd(mutate('git add src/data/shipment_forecast.json', 'git add "src/data/shipment_forecast.json"'))).toEqual([]);
    expect(checkGitAdd(mutate('git add src/data/shipment_forecast.json', "git add 'src/data/other.json'")).length).toBeGreaterThan(0);
  });

  test('A1 道具：cron 違い・cron 2つ・push 起動・pull_request 起動・手動なしを検出', () => {
    expect(checkTriggers(mutate("'30 19 * * *'", "'30 4 * * *'")).length).toBeGreaterThan(0);
    expect(checkTriggers(mutate("    - cron: '30 19 * * *'\n", "    - cron: '30 19 * * *'\n    - cron: '0 1 * * *'\n")).length).toBeGreaterThan(0);
    expect(checkTriggers(mutate('  workflow_dispatch:\n', '  workflow_dispatch:\n  push:\n    branches: [main]\n')).length).toBeGreaterThan(0);
    expect(checkTriggers(mutate('  workflow_dispatch:\n', '  workflow_dispatch:\n  pull_request:\n')).length).toBeGreaterThan(0);
    expect(checkTriggers(mutate('  workflow_dispatch:\n', '')).length).toBeGreaterThan(0);
    expect(checkTriggers(mutate("'30 19 * * *'", "'0 18 * * *'"), { forbiddenCron: '0 18 * * *' }).length).toBeGreaterThan(0);
  });

  test('A2 道具：権限の足しすぎ・ジョブ側の権限・ref なし・ref 違いを検出', () => {
    expect(checkPermissionsAndCheckout(mutate('  contents: write\n', '  contents: write\n  pull-requests: write\n')).length).toBeGreaterThan(0);
    expect(checkPermissionsAndCheckout(mutate('  contents: write\n', '  contents: read\n')).length).toBeGreaterThan(0);
    expect(checkPermissionsAndCheckout(mutate('    runs-on: ubuntu-latest\n', '    runs-on: ubuntu-latest\n    permissions:\n      actions: write\n')).length).toBeGreaterThan(0);
    expect(checkPermissionsAndCheckout(mutate('        with:\n          ref: main\n', '')).length).toBeGreaterThan(0);
    expect(checkPermissionsAndCheckout(mutate('ref: main', 'ref: develop')).length).toBeGreaterThan(0);
  });

  test('A3 道具：continue-on-error・if: always()・|| true・set +e・exit 0・部品の呼び方違いを検出', () => {
    expect(checkFailureNotSwallowed(mutate('      - name: Fetch shipment forecast\n', '      - name: Fetch shipment forecast\n        continue-on-error: true\n')).length).toBeGreaterThan(0);
    expect(checkFailureNotSwallowed(mutate('      - name: Commit and push changes\n', '      - name: Commit and push changes\n        if: always()\n')).length).toBeGreaterThan(0);
    expect(checkFailureNotSwallowed(mutate('      - name: Commit and push changes\n', '      - name: Commit and push changes\n        if: ${{ failure() }}\n')).length).toBeGreaterThan(0);
    expect(checkFailureNotSwallowed(mutate('      - name: Commit and push changes\n', '      - name: Commit and push changes\n        if: ${{ !cancelled() }}\n')).length).toBeGreaterThan(0);
    expect(checkFailureNotSwallowed(mutate('run: node scripts/fetch_shipment_forecast.mjs', 'run: node scripts/fetch_shipment_forecast.mjs || true')).length).toBeGreaterThan(0);
    expect(checkFailureNotSwallowed(mutate('run: node scripts/fetch_shipment_forecast.mjs', 'run: node scripts/fetch_shipment_forecast.mjs || :')).length).toBeGreaterThan(0);
    expect(checkFailureNotSwallowed(mutate('run: node scripts/fetch_shipment_forecast.mjs', 'run: node scripts/fetch_shipment_forecast.mjs; true')).length).toBeGreaterThan(0);
    expect(checkFailureNotSwallowed(mutate('          git config user.name', '          set +e\n          git config user.name')).length).toBeGreaterThan(0);
    expect(checkFailureNotSwallowed(mutate('            echo "No changes to commit"\n', '            echo "No changes to commit"\n            exit 0\n')).length).toBeGreaterThan(0);
    expect(checkFailureNotSwallowed(mutate('run: node scripts/fetch_shipment_forecast.mjs', 'run: node scripts/other.mjs')).length).toBeGreaterThan(0);
  });

  test('A4 道具：git add -A・.・--all・-u・-f・ワイルドカード・ディレクトリ・複数回を検出', () => {
    for (const bad of ['-A', '.', '--all', '-u', '-f src/data/shipment_forecast.json', 'src/data/*.json', 'src/data/', 'src/data/shipment_forecast.json src/data/other.json']) {
      expect(checkGitAdd(mutate('git add src/data/shipment_forecast.json', `git add ${bad}`)).length, bad).toBeGreaterThan(0);
    }
    expect(checkGitAdd(mutate('git add src/data/shipment_forecast.json', 'git add src/data/shipment_forecast.json\n          git add -A')).length).toBeGreaterThan(0);
    expect(checkGitAdd(mutate('          git add src/data/shipment_forecast.json\n', '')).length).toBeGreaterThan(0);
  });

  test('A5 道具：差分なしの枝にコミットがある形・差分の確認が無い形・コミットが枝の外にある形を検出', () => {
    const noCheck = GOOD.replace(/ {10}if git diff[\s\S]*?\n {10}fi\n/, "          git commit -m 'Update shipment forecast'\n          git push origin main\n");
    expect(noCheck).not.toBe(GOOD);
    expect(checkNoDiffBranch(noCheck).length).toBeGreaterThan(0);
    const inverted = mutate('if git diff --cached --quiet; then', 'if ! git diff --cached --quiet; then');
    expect(checkNoDiffBranch(inverted).length).toBeGreaterThan(0); // 否定にすると echo 側が差分ありの枝になり、枝が逆
    const commitInNoDiff = mutate('echo "No changes to commit"', "echo \"No changes\"\n            git commit -m 'x'");
    expect(checkNoDiffBranch(commitInNoDiff).length).toBeGreaterThan(0);
    const commitOutside = mutate("          git add src/data/shipment_forecast.json\n", "          git add src/data/shipment_forecast.json\n          git commit -m 'early'\n");
    expect(checkNoDiffBranch(commitOutside).length).toBeGreaterThan(0);
  });

  test('A6 道具：run の中の secrets・他の秘密・set -x・デバッグ変数・printenv・env 単独・鍵の echo・差し込み付きコミット文言を検出', () => {
    expect(checkSecrets(mutate('run: node scripts/fetch_shipment_forecast.mjs', 'run: echo ${{ secrets.X }}')).length).toBeGreaterThan(0);
    expect(checkSecrets(mutate('          git config user.name', '          echo ${{ secrets.OTHER }}\n          git config user.name')).length).toBeGreaterThan(0);
    expect(checkSecrets(mutate('        run: node scripts/fetch_shipment_forecast.mjs', '          OTHER: ${{ secrets.OTHER }}\n        run: node scripts/fetch_shipment_forecast.mjs')).length).toBeGreaterThan(0);
    expect(checkSecrets(mutate('          git config user.name', '          set -x\n          git config user.name')).length).toBeGreaterThan(0);
    expect(checkSecrets(mutate('on:\n', 'env:\n  ACTIONS_STEP_DEBUG: true\non:\n')).length).toBeGreaterThan(0);
    expect(checkSecrets(mutate('on:\n', 'env:\n  ACTIONS_RUNNER_DEBUG: true\non:\n')).length).toBeGreaterThan(0);
    expect(checkSecrets(mutate('          git config user.name', '          printenv\n          git config user.name')).length).toBeGreaterThan(0);
    expect(checkSecrets(mutate('          git config user.name', '          env\n          git config user.name')).length).toBeGreaterThan(0);
    expect(checkSecrets(mutate('          git config user.name', '          echo "$CULTIVATION_SNAPSHOT_READER_KEY"\n          git config user.name')).length).toBeGreaterThan(0);
    expect(checkSecrets(mutate("git commit -m 'Update shipment forecast'", 'git commit -m "Update $(date)"')).length).toBeGreaterThan(0);
    expect(checkSecrets(mutate("git commit -m 'Update shipment forecast'", "git commit -m 'Update ${{ github.actor }}'")).length).toBeGreaterThan(0);
    // 鍵の1行が無くなっても検出する
    expect(checkSecrets(mutate('          CULTIVATION_SNAPSHOT_READER_KEY: ${{ secrets.CULTIVATION_SNAPSHOT_READER_KEY }}\n', '')).length).toBeGreaterThan(0);
  });

  test('A7 道具：develop への push・--force・-f・--force-with-lease・タグ・reset・fetch を検出', () => {
    for (const bad of ['git push origin develop', 'git push --force origin main', 'git push -f origin main', 'git push --force-with-lease origin main', 'git push origin main --tags', 'git push --tags', 'git push']) {
      expect(checkPush(mutate('git push origin main', bad)).length, bad).toBeGreaterThan(0);
    }
    expect(checkPush(mutate('git push origin main', 'git push origin HEAD:main'))).toEqual([]); // 許す形
    expect(checkPush(mutate('          git add src', '          git fetch origin main\n          git reset --soft origin/main\n          git add src')).length).toBeGreaterThan(0);
  });
});

const PART_OK = {
  'scripts/shipment_forecast/storage_reader.mjs': `
    const SCOPE = 'https://www.googleapis.com/auth/devstorage.read_only';
    // PUT なんとか（コメントなので数えない）
    const t = await doFetch(tokenUri, { method: 'POST' });
    const res = await doFetch('https://storage.googleapis.com/storage/v1/b/x/o/y?alt=media', { method: 'GET' });
  `,
  'scripts/shipment_forecast/forecast.mjs': 'const byCrop = new Map(); byCrop.set(a, b);', // 純粋なデータ操作の Map は許す
};

describe('A13 の道具の陽性コントロール', () => {
  test('読むだけの見本は引っかからない（コメント内の PUT・https:// の // ・Map.set は数えない）', () => {
    expect(checkReadOnly(PART_OK)).toEqual([]);
  });

  test('書き込みの呼び出しを含む合成の文字列で引っかかる', () => {
    const base = PART_OK['scripts/shipment_forecast/storage_reader.mjs'];
    const bad = (extra) => checkReadOnly({ ...PART_OK, 'scripts/shipment_forecast/storage_reader.mjs': base + extra });
    expect(bad("fetch(u, { method: 'PUT' });").length).toBeGreaterThan(0);
    expect(bad("fetch(u, { method: 'PATCH' });").length).toBeGreaterThan(0);
    expect(bad("fetch(u, { method: 'DELETE' });").length).toBeGreaterThan(0);
    expect(bad("fetch('https://storage.googleapis.com/upload/storage/v1/b/x/o');").length).toBeGreaterThan(0);
    expect(bad("const q = '?uploadType=media';").length).toBeGreaterThan(0);
    expect(bad('await file.save(data);').length).toBeGreaterThan(0);
    expect(bad('await file.delete();').length).toBeGreaterThan(0);
    expect(bad('await doc.set(x);').length).toBeGreaterThan(0);
    expect(bad('await doc.update(x);').length).toBeGreaterThan(0);
    expect(bad("import { getFirestore } from 'firebase-admin/firestore';").length).toBeGreaterThan(0);
    expect(bad("fetch(u, { method: 'POST' });").length).toBeGreaterThan(0); // POST の2か所目
    expect(bad("const S2 = 'https://www.googleapis.com/auth/devstorage.read_write';").length).toBeGreaterThan(0);
    expect(bad("const S3 = 'https://www.googleapis.com/auth/cloud-platform';").length).toBeGreaterThan(0);
    expect(bad("const S4 = 'https://www.googleapis.com/auth/datastore';").length).toBeGreaterThan(0);
    expect(bad("const S5 = 'devstorage.full_control';").length).toBeGreaterThan(0);
    // 点検で足した書き込み系（通信を扱うファイルだけ）・メソッド指定は大文字小文字を区別しない
    expect(bad("fetch(u, { method: 'put' });").length).toBeGreaterThan(0);
    expect(bad("fetch(u, { method: 'Delete' });").length).toBeGreaterThan(0);
    for (const call of ['await b.commit();', 'await f.upload(x);', 'fs.createWriteStream(p);', 'await f.setMetadata(m);', 'await f.makePublic();', 'await f.copy(d);', 'await f.move(d);']) {
      expect(bad(call).length, call).toBeGreaterThan(0);
    }
    // 入口でない run.mjs のローカルの書き出しは対象外
    expect(checkReadOnly({ ...PART_OK, 'scripts/shipment_forecast/run.mjs': "fs.writeFileSync(p, t); fs.renameSync(a, b); list.update(x);" })).toEqual([]);
  });

  test('読み出し（alt=media）が0件なら緑にならない・scope の指定が無くても緑にならない', () => {
    const noRead = { 'scripts/shipment_forecast/storage_reader.mjs': PART_OK['scripts/shipment_forecast/storage_reader.mjs'].replace('?alt=media', '') };
    expect(checkReadOnly(noRead).length).toBeGreaterThan(0);
    const noScope = { 'scripts/shipment_forecast/storage_reader.mjs': PART_OK['scripts/shipment_forecast/storage_reader.mjs'].replace('auth/devstorage.read_only', 'x') };
    expect(checkReadOnly(noScope).length).toBeGreaterThan(0);
  });

  test('POST が鍵の引き換え口以外のファイルにあると引っかかる', () => {
    expect(checkReadOnly({ ...PART_OK, 'scripts/shipment_forecast/run.mjs': "fetch(u, { method: 'POST' });" }).length).toBeGreaterThan(0);
  });
});

describe('実物のワークフロー（まだ無ければ赤になるのが正しい）', () => {
  test('A1 実行時刻は日本時間 4:30（cron は 30 19 * * * の1つだけ）・手動実行あり・push など他の起動なし・Instagram と同じ時刻でない', () => {
    const igCron = fs.readFileSync(INSTAGRAM_WORKFLOW_PATH, 'utf8').match(/cron\s*:\s*['"]([^'"]+)['"]/)?.[1];
    expect(igCron, 'instagram_sync.yml の cron が読めない').toBeTruthy();
    expect(EXPECTED_CRON).toBe('30 19 * * *');
    expect(checkTriggers(readWorkflowText(), { forbiddenCron: igCron })).toEqual([]);
  });

  test('A2 権限は最上位の contents: write だけ・ジョブで足さない・checkout に ref: main', () => {
    expect(checkPermissionsAndCheckout(readWorkflowText())).toEqual([]);
  });

  test('A3 部品は node scripts/fetch_shipment_forecast.mjs で、失敗を握り潰す書き方（continue-on-error・always()・|| true 等）が無い', () => {
    expect(checkFailureNotSwallowed(readWorkflowText())).toEqual([]);
  });

  test('A4 git add は1回だけで src/data/shipment_forecast.json の1ファイルだけ', () => {
    expect(checkGitAdd(readWorkflowText())).toEqual([]);
  });

  test('A5 差分が無いときはコミットも push もせず正常に終わる形', () => {
    expect(checkNoDiffBranch(readWorkflowText())).toEqual([]);
    expect(checkStepOrder(readWorkflowText())).toEqual([]); // 部品 → git add → 差分確認 → commit・push の順
  });

  test('A6 secrets は部品の env の鍵1行だけ・ログに出す書き方（set -x・printenv・echo 等）が無い・コミット文言は固定', () => {
    expect(checkSecrets(readWorkflowText())).toEqual([]);
  });

  test('A7 push は main だけ・force やタグの push なし・reset と fetch なし', () => {
    expect(checkPush(readWorkflowText())).toEqual([]);
  });
});

describe('A13 実物の部品（scripts/shipment_forecast/*.mjs と入口）', () => {
  test('A13 書き込みの呼び出しが0件で、読み出し（alt=media）が1件以上・権限は devstorage.read_only だけ', () => {
    const files = readPartFiles();
    expect(Object.keys(files).length).toBeGreaterThanOrEqual(8); // 部品が読めている（0件で緑にしない）
    expect(checkReadOnly(files)).toEqual([]);
  });
});
