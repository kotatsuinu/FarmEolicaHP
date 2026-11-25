// 小さな見本を組み立てる道具（形は fixtures/ の SF と同じ。期待値の計算には使わない）
export const MISSING = Symbol('missing');

export function applyOver(base, over) {
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) {
    if (v === MISSING) delete out[k];
    else out[k] = v;
  }
  return out;
}

export const stageBase = (name) => ({ stage_name: name, start_date: '2026-10-01', stage_id: 'stg-t' });
export const stageEff = (name, source = 'cultivation') => ({ ...stageBase(name), source });

export function variety(name, count, over = {}) {
  return applyOver(
    {
      variety_id: `v-${name}`,
      variety_name: name,
      planned_count: count,
      bed_numbers: null,
      current_stage: null,
      current_stage_effective: null,
    },
    over,
  );
}

let seq = 0;
export function resetSeq() {
  seq = 0;
}
export function cult(over = {}) {
  seq += 1;
  const no = `2098${String(seq).padStart(2, '0')}`;
  return applyOver(
    {
      cultivation_no: no,
      flower_type: 'ストック',
      status: 'active',
      status_source: 'stored',
      start_date: '2026-09-01',
      actual_planting_date: null,
      harvest_start: '2026-12-10',
      harvest_end: null,
      planned_count_total: 800,
      variety_counts_usable: true,
      varieties: [variety('ホワイト', 800)],
      current_stage: { cultivation: null, representative: null },
      location: 'LOC-T',
      bed_numbers: 'BED-T',
    },
    over,
  );
}

// 総数だけの1行になる作付け（品種の内訳なし）
export function totalOnly(count, over = {}) {
  return cult({ planned_count_total: count, variety_counts_usable: false, varieties: [], ...over });
}

export function snap(cultivations, over = {}) {
  const { generated_at = '2026-11-13T04:00:00+09:00', generated_for_date = '2026-11-13', ...extra } = over;
  return {
    snapshot_version: 1,
    generated_at,
    generated_for_date,
    generator: { function: 'buildCultivationSnapshot', revision: 'rev-test' },
    sources: {
      cultivations: { ok: true, read: cultivations.length },
      cultivation_stages: { ok: true, read: 0 },
      cultivation_varieties: { ok: true, read: 0 },
      planting_records: { ok: true, read: 0 },
      polyculture_varieties: { ok: true, read: 0 },
    },
    main: { cultivations, name_unresolved_count: 0 },
    other: { plantings: [] },
    weekly_tasks: { range: { from: '2026-11-07', to: '2026-11-20' }, tasks: [] },
    ...extra,
  };
}

// 出力（forecast）を行の一覧にならす（並びは変えない）
export function rowsOf(forecast) {
  return forecast.items.flatMap((it) => it.rows.map((r) => ({ crop: it.crop, ...r })));
}
export const row = (variety, from, to, status, section, label) => ({
  variety,
  harvest_from: from,
  harvest_to: to,
  status,
  section,
  count_label: label,
});

// 並びを問わない比較用（品目名→行の文字列の順にそろえる）
export function canon(forecast) {
  const items = forecast.items
    .map((it) => ({
      crop: it.crop,
      rows: [...it.rows].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    }))
    .sort((a, b) => (a.crop < b.crop ? -1 : a.crop > b.crop ? 1 : 0));
  return { generated_at: forecast.generated_at, items };
}
