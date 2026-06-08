# レッスンデザインジェネレーター

Blooming Sugar 講座生限定で使う、レッスンデザイン案・画像生成・訴求アイディア・レジュメ生成アプリです。

## 主な機能

- 生徒様ごとのログイン
- お教室設定の保存
- レッスンごとのデザインプロンプト作成
- OpenAI画像生成
- 作ったデザインの保存一覧
- レッスン用レジュメのHTML生成

## Cloudflareで使うもの

- Cloudflare Pages
- Cloudflare D1
- Pages Functions
- OpenAI API Key

## セットアップ概要

1. GitHubにこのリポジトリを push
2. Cloudflare Pages でGitHubリポジトリを接続
3. D1データベースを作成
4. `wrangler.toml` の `database_id` をD1のIDに変更
5. `migrations/0001_init.sql` をD1へ適用
6. Pages の環境変数に `OPENAI_API_KEY` を設定
7. 再デプロイ

画像生成には OpenAI API 利用料金が発生します。
Deployment refresh: 2026-06-08

