// 偽の読み出し口・ログの受け皿・目印の検査
export const FIXED_BUCKET = 'fe-cultivation-snapshot';
export const FIXED_PATH = 'cultivation_snapshot/latest.json';

// 決め打ちの保管庫とパスを聞かれたときだけ中身を返す。それ以外は「無い」（パスを間違えても答えてしまう作りにしない）
export function makeFakeReader({ text = '', status = 200, throwError = null, updated = null } = {}) {
  const calls = { read: [], list: [] };
  return {
    calls,
    async readObject({ bucket, path }) {
      calls.read.push({ bucket, path });
      if (throwError) throw throwError;
      if (bucket !== FIXED_BUCKET || path !== FIXED_PATH) return { status: 404, text: '' };
      if (status !== 200) return { status, text: '' };
      return { status: 200, text, updated: updated ?? new Date().toISOString() };
    },
    // 部品は一覧を取らない約束。呼ばれたら記録する（GA1）
    async listObjects(args) {
      calls.list.push(args);
      return [];
    },
  };
}

export function makeLogger() {
  const lines = [];
  const push = (level) => (message) => {
    lines.push(`${level}: ${String(message)}`);
  };
  return { lines, info: push('info'), warn: push('warn'), error: push('error') };
}

export function findMarkers(text, markers) {
  return markers.filter((m) => text.includes(String(m)));
}

// スタックトレースらしい行（"    at 関数 (場所)" や "    at 場所:行:列"）
export const STACK_LINE = /^\s+at\s+\S.*$/m;
