// 出荷予報 段3：毎朝の自動実行ワークフロー（.github/workflows/shipment_forecast_sync.yml）の「書き方」を確かめる道具
// 依存なし。YAML ライブラリは使わず、行と字下げだけで読む（対象は自分たちで書く短いファイル）
// 各 check* は「約束を破っている点」の文字列の配列を返す。空配列＝約束どおり
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
export const DEFAULT_WORKFLOW_PATH = path.join(REPO_ROOT, '.github', 'workflows', 'shipment_forecast_sync.yml');
export const INSTAGRAM_WORKFLOW_PATH = path.join(REPO_ROOT, '.github', 'workflows', 'instagram_sync.yml');

// 期待値は手で換算した固定の文字列（日本時間 4:30 ＝ UTC 19:30 の前日）
export const EXPECTED_CRON = '30 19 * * *';
export const KEY_ENV = 'CULTIVATION_SNAPSHOT_READER_KEY';
export const OUTPUT_FILE = 'src/data/shipment_forecast.json';
export const PART_COMMAND = 'node scripts/fetch_shipment_forecast.mjs';

// ファイルが無いときは例外を投げる（テストを飛ばさず・緑にせず、赤にする）
export function readWorkflowText(p = process.env.SHIPMENT_FORECAST_WORKFLOW_PATH || DEFAULT_WORKFLOW_PATH) {
  if (!fs.existsSync(p)) throw new Error(`ワークフローのファイルが無い: ${p}`);
  return fs.readFileSync(p, 'utf8');
}

// ---- 行と字下げの読み取り ----
const indentOf = (line) => line.length - line.trimStart().length;

// 全行コメント・空行を除き、行末のコメントを落とす
export function cleanLines(text) {
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '' && !l.trim().startsWith('#'))
    .map((l) => l.replace(/\s+#.*$/, ''));
}

// 最上位のキー（例 'on'・'permissions'）の直下のぶら下がり行（字下げが深い行）
function topBlock(lines, key) {
  const i = lines.findIndex((l) => indentOf(l) === 0 && new RegExp(`^["']?${key}["']?\\s*:`).test(l));
  if (i < 0) return null;
  const head = lines[i];
  const body = [];
  for (let j = i + 1; j < lines.length && indentOf(lines[j]) > 0; j++) body.push(lines[j]);
  return { head, body };
}

// steps: の下を1ステップずつの行の塊に分ける
export function splitSteps(lines) {
  const steps = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*steps\s*:\s*$/.test(lines[i])) continue;
    const base = indentOf(lines[i]);
    let stepIndent = null;
    let cur = null;
    for (let j = i + 1; j < lines.length && indentOf(lines[j]) > base; j++) {
      const l = lines[j];
      if (stepIndent === null && l.trimStart().startsWith('- ')) stepIndent = indentOf(l);
      if (indentOf(l) === stepIndent && l.trimStart().startsWith('- ')) {
        cur = [l];
        steps.push(cur);
      } else if (cur) cur.push(l);
    }
  }
  return steps;
}

// ステップの run の中身（1行でも複数行の `|` でも、行の配列で返す）
function runLinesOfStep(step) {
  const out = [];
  for (let i = 0; i < step.length; i++) {
    const m = step[i].match(/^(\s*)(- )?run\s*:\s*(.*)$/);
    if (!m) continue;
    const keyIndent = m[1].length + (m[2] ? 2 : 0);
    const val = m[3].trim();
    if (/^[|>][+-]?$/.test(val)) {
      for (let j = i + 1; j < step.length && indentOf(step[j]) > keyIndent; j++) out.push(step[j].trim());
    } else if (val !== '') out.push(val.replace(/^(['"])(.*)\1$/, '$2'));
  }
  return out;
}

// ステップの env: ブロックの行
function envLinesOfStep(step) {
  for (let i = 0; i < step.length; i++) {
    const m = step[i].match(/^(\s*)(- )?env\s*:\s*$/);
    if (!m) continue;
    const keyIndent = m[1].length + (m[2] ? 2 : 0);
    const body = [];
    for (let j = i + 1; j < step.length && indentOf(step[j]) > keyIndent; j++) body.push(step[j].trim());
    return body;
  }
  return [];
}

function withLinesOfStep(step) {
  for (let i = 0; i < step.length; i++) {
    const m = step[i].match(/^(\s*)(- )?with\s*:\s*$/);
    if (!m) continue;
    const keyIndent = m[1].length + (m[2] ? 2 : 0);
    const body = [];
    for (let j = i + 1; j < step.length && indentOf(step[j]) > keyIndent; j++) body.push(step[j].trim());
    return body;
  }
  return [];
}

const allRunLines = (steps) => steps.flatMap(runLinesOfStep);
const partStepsOf = (steps) => steps.filter((s) => runLinesOfStep(s).some((l) => l.includes('fetch_shipment_forecast')));

// run の全行から「git <サブコマンド> の引数部分」を取り出す（; & | と改行の手前まで）
function gitCalls(runLines, sub) {
  const calls = [];
  const re = new RegExp(`\\bgit\\s+${sub}\\b([^;&|\\n]*)`, 'g');
  for (const l of runLines) for (const m of l.matchAll(re)) calls.push(m[1].trim());
  return calls;
}

// ---- A1：起動の仕方 ----
export function checkTriggers(text, { expectedCron = EXPECTED_CRON, forbiddenCron } = {}) {
  const v = [];
  const lines = cleanLines(text);
  const on = topBlock(lines, 'on');
  if (!on) return ['on: が無い'];
  if (on.head.replace(/^["']?on["']?\s*:/, '').trim() !== '') v.push('on: が1行書き（push などを含みうる）');
  const childIndent = on.body.length ? Math.min(...on.body.map(indentOf)) : 0;
  const keys = on.body.filter((l) => indentOf(l) === childIndent).map((l) => l.trim().replace(/\s*:.*$/, ''));
  for (const k of keys) if (k !== 'schedule' && k !== 'workflow_dispatch') v.push(`許していない起動: ${k}`);
  if (!keys.includes('workflow_dispatch')) v.push('workflow_dispatch（手動実行）が無い');
  if (!keys.includes('schedule')) v.push('schedule が無い');
  const crons = on.body.map((l) => l.match(/cron\s*:\s*['"]?([^'"]*?)['"]?\s*$/)).filter(Boolean).map((m) => m[1].trim());
  if (crons.length !== 1) v.push(`cron が ${crons.length} 個（1個だけのはず）`);
  else {
    if (crons[0] !== expectedCron) v.push(`cron が ${crons[0]}（期待 ${expectedCron}）`);
    if (forbiddenCron && crons[0] === forbiddenCron) v.push('Instagram と同じ時刻');
  }
  return v;
}

// ---- A2：権限と取り出し ----
export function checkPermissionsAndCheckout(text) {
  const v = [];
  const lines = cleanLines(text);
  const perm = topBlock(lines, 'permissions');
  if (!perm) v.push('最上位の permissions: が無い');
  else {
    const rest = perm.head.replace(/^["']?permissions["']?\s*:/, '').trim();
    if (rest !== '') v.push(`permissions が1行書き: ${rest}`);
    const body = perm.body.map((l) => l.trim());
    if (body.length !== 1 || body[0] !== 'contents: write') v.push(`permissions が contents: write だけでない: ${body.join(' / ')}`);
  }
  // ジョブ側（字下げ付き）の permissions
  if (lines.some((l) => indentOf(l) > 0 && /^\s*permissions\s*:/.test(l))) v.push('ジョブ側で permissions を足している');
  const steps = splitSteps(lines);
  const checkouts = steps.filter((s) => s.some((l) => /uses\s*:\s*actions\/checkout@/.test(l)));
  if (checkouts.length !== 1) v.push(`actions/checkout が ${checkouts.length} 回`);
  else if (!withLinesOfStep(checkouts[0]).some((l) => /^ref\s*:\s*['"]?main['"]?$/.test(l))) v.push('checkout に ref: main が無い');
  return v;
}

// ---- A3：部品の失敗を握り潰さない ----
export function checkFailureNotSwallowed(text) {
  const v = [];
  const lines = cleanLines(text);
  const steps = splitSteps(lines);
  if (lines.some((l) => /continue-on-error/.test(l))) v.push('continue-on-error がある');
  for (const l of lines) {
    const m = l.match(/^\s*(?:- )?if\s*:\s*(.*)$/);
    if (m && /always\s*\(|failure\s*\(|cancelled\s*\(|success\s*\(\)\s*\|\|/.test(m[1])) v.push(`失敗でも進む条件: ${l.trim()}`);
  }
  const run = allRunLines(steps);
  for (const l of run) {
    if (/\|\|\s*(true|:)\b/.test(l) || /;\s*true\b/.test(l)) v.push(`失敗を無視する書き方: ${l}`);
    if (/\bset\s+\+e\b/.test(l)) v.push(`set +e: ${l}`);
    if (/\bexit\s+0\b/.test(l)) v.push(`exit 0: ${l}`);
  }
  const parts = partStepsOf(steps);
  if (parts.length !== 1) v.push(`部品を呼ぶステップが ${parts.length} 個（1個のはず）`);
  else {
    const cmd = runLinesOfStep(parts[0]).join('\n').trim();
    if (cmd !== PART_COMMAND) v.push(`部品のコマンドが ${PART_COMMAND} だけでない: ${cmd}`);
  }
  return v;
}

// ---- A4：git add は1回・1ファイルだけ ----
export function checkGitAdd(text) {
  const v = [];
  const adds = gitCalls(allRunLines(splitSteps(cleanLines(text))), 'add');
  if (adds.length !== 1) v.push(`git add が ${adds.length} 回（1回のはず）`);
  for (const a of adds) if (a !== OUTPUT_FILE) v.push(`git add の引数が ${OUTPUT_FILE} だけでない: ${a}`);
  return v;
}

// ---- A5：差分が無ければコミットせず正常終了 ----
export function checkNoDiffBranch(text) {
  const v = [];
  const run = allRunLines(splitSteps(cleanLines(text)));
  const iDiff = run.findIndex((l) => /git diff --cached --quiet/.test(l));
  if (iDiff < 0) return ['git diff --cached --quiet が無い'];
  const negated = /!\s*git diff --cached --quiet/.test(run[iDiff]);
  const iElse = run.findIndex((l, i) => i > iDiff && /^else\b/.test(l));
  const iFi = run.findIndex((l, i) => i > iDiff && /^fi\b/.test(l));
  if (iFi < 0) return ['if の閉じ（fi）が無い'];
  const isAct = (l) => /\bgit\s+(commit|push)\b/.test(l);
  const hasCommit = run.some((l) => /\bgit\s+commit\b/.test(l));
  const hasPush = run.some((l) => /\bgit\s+push\b/.test(l));
  if (!hasCommit || !hasPush) v.push('コミットまたは push が無い');
  // 差分なしの枝：否定なら then の外（else 側）、否定なしなら then 側
  const noDiffRange = negated ? (iElse >= 0 ? [iElse + 1, iFi] : [iFi, iFi]) : [iDiff + 1, iElse >= 0 ? iElse : iFi];
  for (let i = noDiffRange[0]; i < noDiffRange[1]; i++) if (isAct(run[i])) v.push(`差分なしの枝にコミット・push がある: ${run[i]}`);
  // コミット・push は差分ありの枝の中だけ
  const diffRange = negated ? [iDiff + 1, iElse >= 0 ? iElse : iFi] : iElse >= 0 ? [iElse + 1, iFi] : [iFi, iFi];
  run.forEach((l, i) => {
    if (isAct(l) && (i < diffRange[0] || i >= diffRange[1])) v.push(`差分ありの枝の外にコミット・push がある: ${l}`);
  });
  // `|| exit 0` などの早期終了形は A3 側で exit 0 として弾く
  return v;
}

// ---- A6：秘密を出さない ----
export function checkSecrets(text) {
  const v = [];
  const lines = cleanLines(text);
  const steps = splitSteps(lines);
  const okLine = new RegExp(`^${KEY_ENV}\\s*:\\s*\\$\\{\\{\\s*secrets\\.${KEY_ENV}\\s*\\}\\}$`);
  // 部品のステップの env に正しい1行がある
  const parts = partStepsOf(steps);
  if (parts.length !== 1) v.push(`部品を呼ぶステップが ${parts.length} 個`);
  else if (envLinesOfStep(parts[0]).filter((l) => okLine.test(l)).length !== 1) v.push('部品のステップの env に鍵の1行が無い');
  // secrets の出現は、その1行だけ
  const secretLines = lines.filter((l) => /\bsecrets\b/.test(l));
  if (secretLines.length !== 1) v.push(`secrets が ${secretLines.length} か所に出る（1か所のはず）: ${secretLines.map((l) => l.trim()).join(' | ')}`);
  for (const l of secretLines) if (!okLine.test(l.trim())) v.push(`許していない secrets の参照: ${l.trim()}`);
  const run = allRunLines(steps);
  for (const l of run) {
    if (/\bsecrets\b/.test(l)) v.push(`run の中に secrets: ${l}`);
    if (/\bset\s+-[a-z]*x/.test(l)) v.push(`set -x: ${l}`);
    if (/\bprintenv\b/.test(l)) v.push(`printenv: ${l}`);
    if (/(^|[;&|]\s*)env\s*($|[;&|])/.test(l)) v.push(`env 単独のコマンド: ${l}`);
    if (/\b(echo|cat|printf|tee)\b/.test(l) && l.includes(KEY_ENV)) v.push(`鍵の環境変数を表示する行: ${l}`);
  }
  if (lines.some((l) => /ACTIONS_STEP_DEBUG|ACTIONS_RUNNER_DEBUG/.test(l))) v.push('デバッグ出力の指定がある');
  // コミットの文言は固定の文字列
  const commits = run.filter((l) => /\bgit\s+commit\b/.test(l));
  for (const l of commits) {
    const m = l.match(/git\s+commit\s+-m\s+(?:'([^']*)'|"([^"]*)")\s*$/);
    const msg = m ? (m[1] ?? m[2]) : null;
    if (msg === null) v.push(`コミットの文言が固定の文字列でない: ${l}`);
    else if (/[$`]/.test(msg)) v.push(`コミットの文言に差し込みがある: ${l}`);
  }
  return v;
}

// ---- A7：push は main だけ・履歴を動かさない ----
export function checkPush(text) {
  const v = [];
  const run = allRunLines(splitSteps(cleanLines(text)));
  const pushes = gitCalls(run, 'push');
  if (pushes.length < 1) v.push('git push が無い');
  for (const p of pushes) if (!/^origin (main|HEAD:main)$/.test(p)) v.push(`許していない push: git push ${p}`);
  for (const sub of ['reset', 'fetch', 'pull', 'tag', 'rebase', 'checkout', 'switch']) {
    if (gitCalls(run, sub).length) v.push(`許していない git ${sub}`);
  }
  return v;
}

// ---- A13：部品に書き込みの呼び出しが無い（読むだけ）----
export function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

// files: { 'scripts/…/x.mjs': '中身', ... }。I/O を持つファイルの名前は ioFiles の部分一致で決める
// （.set( などは Map の操作と区別できないため、保管庫・通信を扱うファイルだけで調べる）
export function checkReadOnly(files, { ioFiles = ['storage_reader.mjs', 'credentials.mjs', 'fetch_shipment_forecast.mjs'] } = {}) {
  const v = [];
  let posts = 0;
  let reads = 0;
  const scopes = [];
  for (const [name, raw] of Object.entries(files)) {
    const src = stripComments(raw);
    for (const m of src.matchAll(/\b(PUT|PATCH|DELETE)\b/g)) v.push(`${name}: ${m[1]} のメソッド`);
    if (/\/upload\//.test(src)) v.push(`${name}: /upload/ の URL`);
    if (/uploadType/.test(src)) v.push(`${name}: uploadType`);
    if (/firestore/i.test(src)) v.push(`${name}: firestore`);
    if (ioFiles.some((f) => name.includes(f))) {
      for (const m of src.matchAll(/\.(save|delete|set|update)\(/g)) v.push(`${name}: .${m[1]}( の呼び出し`);
    }
    for (const m of src.matchAll(/\bPOST\b/g)) {
      posts++;
      if (!name.includes('storage_reader.mjs')) v.push(`${name}: POST が鍵の引き換え口以外にある`);
    }
    for (const m of src.matchAll(/read_write|full_control|cloud-platform|datastore\b/g)) v.push(`${name}: 広い権限 ${m[0]}`);
    for (const m of src.matchAll(/googleapis\.com\/auth\/([A-Za-z0-9_.\-]+)/g)) scopes.push(m[1]);
    reads += (src.match(/alt=media/g) || []).length;
  }
  if (posts > 1) v.push(`POST が ${posts} か所（鍵の引き換えの1か所だけのはず）`);
  if (scopes.length < 1) v.push('権限の範囲（scope）の指定が見つからない');
  for (const s of scopes) if (s !== 'devstorage.read_only') v.push(`権限の範囲が read_only でない: ${s}`);
  if (reads < 1) v.push('読み出しの呼び出し（alt=media）が0件');
  return v;
}

// 本物の部品を集める（コメントを除く前の生の中身）
export function readPartFiles() {
  const dir = path.join(REPO_ROOT, 'scripts', 'shipment_forecast');
  const files = {};
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.mjs')).sort()) {
    files[`scripts/shipment_forecast/${f}`] = fs.readFileSync(path.join(dir, f), 'utf8');
  }
  const entry = path.join(REPO_ROOT, 'scripts', 'fetch_shipment_forecast.mjs');
  files['scripts/fetch_shipment_forecast.mjs'] = fs.readFileSync(entry, 'utf8');
  return files;
}
