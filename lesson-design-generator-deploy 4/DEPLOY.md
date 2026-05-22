# GitHub + Cloudflare Deploy 手順

このアプリは Cloudflare Pages + Pages Functions + D1 で動かします。

## 1. GitHubへアップロード

GitHubで新しいリポジトリを作成します。

推奨:

- Repository name: `lesson-design-generator`
- Visibility: `Private`

このフォルダの内容をGitHubへpushします。

## 2. Cloudflare D1を作成

Cloudflare DashboardでD1データベースを作成します。

推奨名:

`lesson-design-generator-db`

作成後、D1の `database_id` をコピーして `wrangler.toml` の以下を置き換えます。

```toml
database_id = "REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID"
```

## 3. テーブルを作成

Cloudflare D1のConsole、またはWranglerから以下のSQLを適用します。

```sql
migrations/0001_init.sql
```

## 4. Cloudflare Pagesに接続

Cloudflare PagesでGitHubリポジトリを接続します。

設定:

- Framework preset: `None`
- Build command: 空欄
- Build output directory: `/`

## 5. 環境変数を設定

Cloudflare PagesのSettingsから環境変数を設定します。

必須:

- `OPENAI_API_KEY`

任意:

- `OPENAI_IMAGE_MODEL`
  - 推奨: `gpt-image-1.5`
  - 低コスト寄り: `gpt-image-1-mini`

## 6. D1 Bindingを設定

Cloudflare PagesのFunctions設定でD1 bindingを追加します。

- Variable name: `DB`
- D1 database: `lesson-design-generator-db`

## 7. 再デプロイ

Pagesで再デプロイすると、ログイン・画像生成・保存一覧・レジュメ生成が使えるようになります。

## 注意

- 画像生成にはOpenAI API利用料金が発生します。
- 生徒様限定にする場合、最初の登録URLを講座生だけに案内してください。
- より厳密にする場合は、管理者が許可したメールアドレスだけ登録できる仕組みを追加します。
