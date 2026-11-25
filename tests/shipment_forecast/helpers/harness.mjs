// 部品の通し（runForecast）を一時フォルダで動かす道具。本物の src/data には書かない
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runForecast } from '../../../scripts/shipment_forecast/run.mjs';
import { makeFakeReader, makeLogger } from './fakes.mjs';

export const realIo = {
  readFile: fsp.readFile,
  writeFile: fsp.writeFile,
  rename: fsp.rename,
  unlink: fsp.unlink,
};

const tmpDirs = [];
export async function makeTmpDir(prefix = 'sf-') {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), prefix));
  tmpDirs.push(dir);
  return dir;
}
export async function cleanupTmp() {
  for (const d of tmpDirs.splice(0)) await fsp.rm(d, { recursive: true, force: true });
}

// opts: snapshot | snapshotText, now(ISO文字列・必須), hidden(文字列・既定 '[]'), hiddenAbsent, prior(前の公開ファイル), reader, readerOpts, io
export async function runCase(opts) {
  const dir = await makeTmpDir();
  const outDir = path.join(dir, 'out');
  const cfgDir = path.join(dir, 'cfg');
  await fsp.mkdir(outDir);
  await fsp.mkdir(cfgDir);
  const outPath = path.join(outDir, 'shipment_forecast.json');
  const hiddenListPath = path.join(cfgDir, 'hidden.json');
  if (!opts.hiddenAbsent) await fsp.writeFile(hiddenListPath, opts.hidden ?? '[]');
  if (opts.prior !== undefined && opts.prior !== null) await fsp.writeFile(outPath, opts.prior);
  const text = opts.snapshotText ?? JSON.stringify(opts.snapshot);
  const reader = opts.reader ?? makeFakeReader({ text, ...(opts.readerOpts ?? {}) });
  const logger = makeLogger();
  const args = { reader, hiddenListPath, outPath, now: new Date(opts.now), logger };
  if (opts.io) args.io = opts.io;
  const result = await runForecast(args);
  const outText = fs.existsSync(outPath) ? await fsp.readFile(outPath, 'utf8') : null;
  const outFiles = await fsp.readdir(outDir);
  return { result, outText, outFiles, logger, logText: logger.lines.join('\n'), outPath, reader, dir };
}
