// 手で書いた期待値（設計書・あらすじ・見本から。実装の出力・見本を作る道具の出力は写さない）
import { row } from './builders.mjs';

// 基準日 2026-11-17。SF1〜SF6（SF4 の完了済み 209914 は外れる）の期待。並びは問わない比較（canon）で使う
export const BASE_EXPECTED = {
  generated_at: '2026-11-17T04:00:00+09:00',
  items: [
    {
      crop: 'カンパニュラ',
      rows: [row('ブルー・ホワイト', '2026-10', '2026-12', 'harvesting', 'shipping', '約2千本')],
    },
    {
      crop: 'スプレーマム',
      rows: [row('ホワイト', '2026-12', null, 'growing', 'soon', '約500本')],
    },
    {
      crop: 'トルコ桔梗',
      rows: [
        // SF1（蕾形成＝bud・来月＝soon）
        row('グリーン', '2026-12', '2027-01', 'bud', 'soon', '約800本'),
        row('ピンク', '2026-12', '2027-01', 'bud', 'soon', '約800本'),
        row('ブルー', '2026-12', '2027-01', 'bud', 'soon', '約800本'),
        row('ホワイト', '2026-12', '2027-01', 'bud', 'soon', '約800本'),
        row('ラベンダー', '2026-12', '2027-01', 'bud', 'soon', '約1千本'),
        // SF3（段階なし・再来月＝later・合計が総数と合わない）
        row('ピンク', '2027-01', '2027-02', 'growing', 'later', '約600本'),
        row('ブルー', '2027-01', '2027-02', 'growing', 'later', '約900本'),
        row('ホワイト', '2027-01', '2027-02', 'growing', 'later', '約1千本'),
      ],
    },
    {
      crop: 'ヒマワリ',
      rows: [
        row('イエロー', '2027-02', '2027-03', 'growing', 'later', '約800本'),
        row('オレンジ', '2027-02', '2027-03', 'growing', 'later', '約400本'),
        row('レモン', '2027-02', '2027-03', 'growing', 'later', '約400本'),
      ],
    },
    {
      crop: 'ストック',
      rows: [
        row('イエロー', '2027-03', '2027-04', 'growing', 'later', '約2千本'),
        row('ピンク', '2027-03', '2027-04', 'growing', 'later', null),
        row('ブルー', '2027-03', '2027-04', 'growing', 'later', null),
        row('ホワイト', '2027-03', '2027-04', 'growing', 'later', '約2千本'),
      ],
    },
  ],
};
export const BASE_ROW_COUNT = 17;

// SF1〜SF10 の全部から出る品目名・品種名（P8 用。入力の見本から手で起こした）
export const ALL_CROPS = new Set(['トルコ桔梗', 'カンパニュラ', 'ストック', 'スプレーマム', 'ヒマワリ', 'ダリア', 'キンギョソウ']);
export const ALL_VARIETIES = new Set([
  'グリーン', 'ピンク', 'ブルー', 'ホワイト', 'ラベンダー', 'ブルー・ホワイト',
  'イエロー', 'オレンジ', 'レモン', 'レッド',
]);

// 設計書 §5.3 の丸めの表（本数 → 表示）。手で起こした
export const ROUND_TABLE = [
  [1, '100本未満'], [50, '100本未満'], [99, '100本未満'],
  [100, '約100本'], [101, '約100本'], [149, '約100本'], [150, '約200本'],
  [800, '約800本'], [949, '約900本'], [950, '約1千本'], [999, '約1千本'],
  [1000, '約1千本'], [1001, '約1千本'], [1499, '約1千本'], [1500, '約2千本'],
  [1830, '約2千本'], [2499, '約2千本'], [2500, '約3千本'],
  [4300, '約4千本'], [5700, '約6千本'], [9499, '約9千本'],
  [9500, '約1万本'], [9999, '約1万本'], [10000, '約1万本'], [10499, '約1万本'],
  [10500, '約1万1千本'], [12400, '約1万2千本'], [19499, '約1万9千本'],
  [19500, '約2万本'], [20000, '約2万本'],
];

// SF10 の目印（見本から手で起こした 68 個）。パス → 入れた値
export const NON_PUBLIC = {
  // 表紙
  'generator.function': 'FN-MARK-01',
  'generator.revision': 'REV-MARK-01',
  'sources.cultivations.read': 3141,
  'sources.cultivation_stages.read': 5926,
  'sources.cultivation_varieties.read': 5358,
  'sources.planting_records.read': 9793,
  'sources.polyculture_varieties.read': 2384,
  'main.name_unresolved_count': 7331,
  // 作付け 0（209920）
  'main.cultivations[0].cultivation_no': '209920',
  'main.cultivations[0].status_source': 'SRC-MARK-01',
  'main.cultivations[0].start_date': '2098-07-07',
  'main.cultivations[0].actual_planting_date': '2098-08-08',
  'main.cultivations[0].planned_count_total': 2590,
  'main.cultivations[0].location': 'LOC-MARK-01',
  'main.cultivations[0].bed_numbers': 'BED-MARK-01',
  'main.cultivations[0].current_stage.cultivation.stage_name': 'STAGE-MARK-C1',
  'main.cultivations[0].current_stage.cultivation.start_date': '2098-02-02',
  'main.cultivations[0].current_stage.cultivation.stage_id': 'STGID-MARK-C1',
  'main.cultivations[0].current_stage.representative.stage_name': 'STAGE-MARK-R1',
  'main.cultivations[0].current_stage.representative.start_date': '2098-03-03',
  'main.cultivations[0].current_stage.representative.stage_id': 'STGID-MARK-R1',
  'main.cultivations[0].varieties[0].variety_id': 'VID-MARK-01',
  'main.cultivations[0].varieties[0].planned_count': 1213,
  'main.cultivations[0].varieties[0].bed_numbers': 'VBED-MARK-01',
  'main.cultivations[0].varieties[0].current_stage.stage_name': 'STAGE-MARK-V1',
  'main.cultivations[0].varieties[0].current_stage.start_date': '2098-01-01',
  'main.cultivations[0].varieties[0].current_stage.stage_id': 'STGID-MARK-V1',
  'main.cultivations[0].varieties[0].current_stage_effective.source': 'SRC-MARK-02',
  'main.cultivations[0].varieties[1].variety_id': 'VID-MARK-02',
  'main.cultivations[0].varieties[1].planned_count': 1377,
  'main.cultivations[0].varieties[1].bed_numbers': 'VBED-MARK-02',
  'main.cultivations[0].varieties[1].current_stage_effective.stage_name': 'STAGE-MARK-C2',
  'main.cultivations[0].varieties[1].current_stage_effective.start_date': '2098-02-12',
  'main.cultivations[0].varieties[1].current_stage_effective.stage_id': 'STGID-MARK-C2',
  'main.cultivations[0].varieties[1].current_stage_effective.source': 'SRC-MARK-03',
  // 作付け 1（209921）
  'main.cultivations[1].cultivation_no': '209921',
  'main.cultivations[1].status_source': 'SRC-MARK-04',
  'main.cultivations[1].start_date': '2098-09-09',
  'main.cultivations[1].planned_count_total': 1827,
  'main.cultivations[1].location': 'LOC-MARK-02',
  'main.cultivations[1].bed_numbers': 'BED-MARK-02',
  'main.cultivations[1].varieties[0].variety_id': 'VID-MARK-03',
  'main.cultivations[1].varieties[0].bed_numbers': 'VBED-MARK-03',
  // その他作物
  'other.plantings[0].record_id': 'REC-MARK-01',
  'other.plantings[0].variety_name': 'OVAR-MARK-01',
  'other.plantings[0].area': 'AREA-MARK-01',
  'other.plantings[0].status': 'OSTAT-MARK-01',
  'other.plantings[0].planting_date': '2098-04-04',
  'other.plantings[0].planned_date': '2098-05-05',
  'other.plantings[0].category': 'CAT-MARK-01',
  'other.plantings[0].next_task': 'NEXT-MARK-01',
  'other.plantings[1].record_id': 'REC-MARK-02',
  'other.plantings[1].variety_name': 'OVAR-MARK-02',
  'other.plantings[1].area': 'AREA-MARK-02',
  'other.plantings[1].status': 'OSTAT-MARK-02',
  'other.plantings[1].planned_date': '2098-05-06',
  'other.plantings[1].category': 'CAT-MARK-02',
  'other.plantings[1].next_task': 'NEXT-MARK-02',
  // 今週の作業
  'weekly_tasks.range.from': '2098-06-06',
  'weekly_tasks.range.to': '2098-06-13',
  'weekly_tasks.tasks[0].task': 'TASK-MARK-01',
  'weekly_tasks.tasks[0].variety_name': 'TVAR-MARK-01',
  'weekly_tasks.tasks[0].area': 'TAREA-MARK-01',
  'weekly_tasks.tasks[0].phase': 'PHASE-MARK-01',
  'weekly_tasks.tasks[0].due_date': '2098-06-07',
  'weekly_tasks.tasks[0].task_id': 'TID-MARK-01',
  'weekly_tasks.tasks[0].occurrence_key': 'OCC-MARK-01',
  'weekly_tasks.tasks[0].category': 'TCAT-MARK-01',
};
export const NON_PUBLIC_COUNT = 68;
// SF10 にある文字列の目印（MARK を含むもの）の種類数
export const STRING_MARKER_COUNT = 43;
// 実行のログで見る目印からは作付け番号を除く（設計 Q12：ログに出してよいのは作付け番号と種類だけ）
export const LOG_MARKERS = Object.entries(NON_PUBLIC)
  .filter(([p]) => !p.endsWith('.cultivation_no'))
  .map(([, v]) => v);
