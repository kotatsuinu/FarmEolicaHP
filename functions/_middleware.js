/**
 * 花信風（かしんふう）メンバーシップ 認証ゲート
 * Cloudflare Pages Functions のルートミドルウェア（全リクエストに対して実行される）。
 *
 * 【何を保護しているか】
 * - `/members` または `/members/` で始まる全パス
 *   → 会員限定コンテンツのため、公開状態に関わらず常に保護する。
 * - `env.MEMBERSHIP_PUBLISHED` が厳密に文字列 'true' でない間（告知GO前）は、
 *   `/membership` または `/law/tokushoho` で始まるパスも合わせて保護する
 *   （申込ページ・特商法表記を告知GOまで非公開にするためのゲート）。
 * - 上記のいずれにも該当しないパスは、何もせず `context.next()` へ素通しする。
 *
 * 【必要な環境変数】（Cloudflare Pages ダッシュボードで設定。手順は functions/README.md 参照）
 * - MEMBERS_BASIC_USER   : Basic認証のユーザー名
 * - MEMBERS_BASIC_PASS   : Basic認証のパスワード（Secretとして登録すること）
 * - MEMBERSHIP_PUBLISHED : 'true' のときだけ /membership・/law/tokushoho の保護を解除する
 *
 * 【GO時の運用】
 * `MEMBERSHIP_PUBLISHED=true` に変更すると、`/membership`・`/law/tokushoho` は
 * 一般公開になり、`/members` のみが引き続き会員限定として保護される。
 *
 * 【判定順序の注意】
 * `/membership` は文字列として `/members` を含むが、"常時保護" の判定は
 * `/members` の直後が `/` または文字列終端であることまで確認するため、
 * `/membership` が誤って "常時保護" 側に吸い込まれることはない
 * （下記 isMembersPath / isGatePath 参照）。
 */

const MEMBERS_PREFIX = '/members';
const MEMBERSHIP_PREFIX = '/membership';
const TOKUSHOHO_PREFIX = '/law/tokushoho';

/** pathname（小文字化済み）が `/members` 配下かどうか。`/membership` 等の前方一致誤爆を避けるため、
 *  完全一致か「prefix + '/'」で始まる場合のみ真とする。 */
function isUnderPrefix(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function denyUnauthorized() {
  return new Response('認証が必要です。', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Farm Eolica", charset="UTF-8"',
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

function denyServiceUnavailable() {
  return new Response('このページは現在利用できません。', {
    status: 503,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

/** SHA-256ダイジェスト経由の定数時間文字列比較（タイミング攻撃対策）。
 *  入力の生の長さや内容で早期returnせず、両文字列を同じ手順でダイジェスト化してから
 *  バイト単位のXOR蓄積で一致判定する。 */
async function timingSafeStringEqual(a, b) {
  const encoder = new TextEncoder();
  const digestA = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(a)));
  const digestB = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(b)));

  let diff = 0;
  for (let i = 0; i < digestA.length; i += 1) {
    diff |= digestA[i] ^ digestB[i];
  }
  return diff === 0;
}

export const onRequest = async (context) => {
  const { request, env, next } = context;

  let pathname;
  try {
    pathname = new URL(request.url).pathname.toLowerCase();
  } catch {
    // パス判定に失敗する異常系。判定不能な場合は保護側（拒否）に倒す。
    return denyServiceUnavailable();
  }

  const isMembersPath = isUnderPrefix(pathname, MEMBERS_PREFIX);
  const isGatePath =
    isUnderPrefix(pathname, MEMBERSHIP_PREFIX) || isUnderPrefix(pathname, TOKUSHOHO_PREFIX);

  const isPublished = env && env.MEMBERSHIP_PUBLISHED === 'true';
  const requiresAuth = isMembersPath || (!isPublished && isGatePath);

  if (!requiresAuth) {
    return next();
  }

  try {
    const expectedUser = env ? env.MEMBERS_BASIC_USER : undefined;
    const expectedPass = env ? env.MEMBERS_BASIC_PASS : undefined;

    // フェイルクローズ: 資格情報が未設定・空文字なら認証を通さず503。next()への素通しは発生させない。
    if (!expectedUser || !expectedPass) {
      return denyServiceUnavailable();
    }

    const authHeader = request.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Basic ')) {
      return denyUnauthorized();
    }

    const base64Credentials = authHeader.slice('Basic '.length).trim();

    let decoded;
    try {
      const binary = atob(base64Credentials);
      const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
      // マルチバイト文字のパスワードでも壊れないよう、バイト列からUTF-8として明示的にデコードする。
      decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      return denyUnauthorized();
    }

    const separatorIndex = decoded.indexOf(':');
    if (separatorIndex === -1) {
      return denyUnauthorized();
    }

    // パスワードに `:` が含まれてもよいよう、最初の `:` のみで分割する。
    const suppliedUser = decoded.slice(0, separatorIndex);
    const suppliedPass = decoded.slice(separatorIndex + 1);

    // ユーザ名・パスワードの両方を評価してから結果を合成する（片方一致での早期returnはしない）。
    const userMatch = await timingSafeStringEqual(suppliedUser, expectedUser);
    const passMatch = await timingSafeStringEqual(suppliedPass, expectedPass);
    const authenticated = userMatch && passMatch;

    if (!authenticated) {
      return denyUnauthorized();
    }

    const upstreamResponse = await next();
    // レスポンスヘッダを書き換え可能な形にコピーしてから会員限定コンテンツ向けヘッダを付与する。
    const response = new Response(upstreamResponse.body, upstreamResponse);
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  } catch {
    // 認証処理中に予期しない例外が発生した場合も、素通しにはせず保護側（拒否）に倒す。
    return denyServiceUnavailable();
  }
};
