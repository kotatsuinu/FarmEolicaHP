# functions/ について（花信風メンバーシップ 認証ゲート）

`_middleware.js` が Cloudflare Pages 上で `/members`（会員限定ページ）と、
告知GO前の `/membership`・`/law/tokushoho` を Basic認証で保護します。

## 設定する環境変数（Cloudflare Pages ダッシュボード）

Pages プロジェクト → Settings → Environment variables で、以下3つを設定してください。

| 変数名 | 内容 | 登録方法 |
|---|---|---|
| `MEMBERS_BASIC_USER` | Basic認証のユーザー名 | 通常の環境変数でOK |
| `MEMBERS_BASIC_PASS` | Basic認証のパスワード | **必ず Secret（暗号化）として登録** |
| `MEMBERSHIP_PUBLISHED` | 告知GOフラグ（`true`/未設定） | 通常の環境変数でOK |

**Production と Preview の両方の環境**に設定してください。片方だけだと、もう片方の環境で
ページが開けなくなります。

## 未設定だとどうなるか

`MEMBERS_BASIC_USER` か `MEMBERS_BASIC_PASS` のどちらか一方でも未設定・空だと、
該当ページは認証を通さず **503（利用できません）** になります。これは事故防止のための
意図的な挙動です（「とりあえず誰でも見られる」状態には絶対にならない設計）。

## パスワードの運用について

このBasic認証は会員全員が同じユーザー名・パスワードを使う「共有パスワード方式」です。
退会した方だけを個別に締め出すことはできません。そのため、**パスワードは定期的に
変更する運用**とし、変更のたびに現会員へ新しいパスワードを案内してください。

## 告知GO時の手順

1. Cloudflare Pages の環境変数 `MEMBERSHIP_PUBLISHED` を `true` に変更する。
   → `/membership`（申込ページ）・`/law/tokushoho`（特商法表記）の保護が自動的に外れ、
   `/members`（会員限定ページ）のみ保護が残ります。
2. `src/config/site.ts` の `SITE_CONFIG.membership.paymentLink.live` に、本番の
   Stripe Payment Link を設定する。
3. 再デプロイする。

上記の順番を守ってください。特に2を忘れて1だけ行うと、テスト用の決済リンクが
本番ページに出てしまう事故につながります（`site.ts` 側にビルド時の安全弁がありますが、
念のため手順として守ってください）。
