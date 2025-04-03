Picadabra 🧙‍♂️✨ – 会話型デザイン X ボット

[English](README.md) | [中文](README_CN.md) | [日本語](README_JP.md)

Picadabraは、生成AIを使ってテキストプロンプトを素晴らしいビジュアルに変えるオープンソースのTwitterボットです。**Gemini**或いは**ChatGPT-4o**の力を借りて、ユーザーはボットにツイートするだけで簡単に画像を作成または編集できます。

👉 実際に試す: [@picadabra on Twitter](https://x.com/picadabra)

---

## ✨ 特長

- 🧠 自然言語からデザインへ: ツイートをデザインアクションに変換。
- 🖼️ AI画像生成＆編集（背景削除、画質向上、シュールな編集）。
- 🤖 Gemini／ChatGPT-4o API を採用。
- 🐦 Twitterとシームレスに連携。
- 🔧 カスタマイズ＆拡張が簡単。

---

## 📸 使用例

ツイート:

> "@picadabra 私の後ろの壁を2枚目の画像のように黒くして"

返信:
➡️ リクエスト通りの編集を施した生成画像.

---

## Cloudflareへのデプロイ

このプロジェクトはCloudflareプラットフォーム向けに設計されており、以下のサービスを利用しています:

1. **Cloudflare Workers** - サーバーレスコード実行用
2. **Cloudflare Workflows** - ツイート処理と画像生成ワークフロー用
3. **Cloudflare KV** - キーバリューストレージ
4. **Cloudflare R2** - オブジェクトストレージ（画像保存用）
5. **Cloudflare D1** - SQLデータベース

### デプロイ手順:

#### 1. Cloudflareコンソールで必要なリソースを作成

- R2バケット作成
- KVネームスペース作成
- Workerリソース作成

こんな感じでWrangler CLIコマンドを使ってもリソース作れるよ：

```bash
# KVネームスペース作成
wrangler kv:namespace create "KV"
# 期待される結果:
# 🌀 Creating namespace with title "twitter-chat2design-KV"
# ✨ Success! Created namespace with ID "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# R2バケット作成
wrangler r2 bucket create twitter-bot
# 期待される結果:
# ✨ Created bucket twitter-bot

# D1データベース作成
wrangler d1 create twitter-bot
# 期待される結果:
# ✅ Created database 'twitter-bot' with ID <database_id>
```

#### 2. リモートD1データベース作成

```bash
pnpm run db:remote
```

リモートDB作成にはスクリプトを使用しています。Wrangler CLIで直接操作する場合：

```bash
wrangler d1 execute twitter-bot --file src/db/migrations/0000_premium_lightspeed.sql --remote
# 期待される結果:
# ✅ twitter-botデータベースでSQLを実行 (xxxxx)
# ➤ テーブル1件作成済み.
```

#### 3. wrangler.jsoncを更新

正しい設定を確認:

- CloudflareアカウントID
- KVネームスペースID
- R2バケット名
- D1データベースID

#### 4. Twitter APIトークン取得＆更新

1. [Twitter Developer Portal](https://developer.x.com/en/portal/dashboard)でアプリ登録
2. `CLIENT_ID`と`CLIENT_SECRET`を取得し、`.env`を更新
3. ローカル認証サーバー実行:

```bash
pnpm run local-server
```

#### 5. secrets.jsonを更新

`secrets.json` ファイルを作成・更新（`secrets.example.json`参照）:

- Twitter認証情報
- APIキー
- R2公開URL

#### 6. シークレットをCloudflareにプッシュ

```bash
pnpm run secrets:push
```

これは、secrets.jsonの内容をCloudflareにプッシュするスクリプトを使用しています。Wrangler CLIを直接使いたい場合は、次のコマンドを実行できます:

```bash
# secrets.jsonからすべてのシークレットを一括プッシュ
pnpm wrangler secret bulk secrets.json
# 期待される結果:
# ✨ 成功！ 8つのシークレット値をアップロードしました
```

#### 7. アプリケーションをデプロイ

```bash
pnpm run deploy
```

これはアプリケーションをデプロイするスクリプトを使用しています。Wrangler CLIを直接使用する場合は、次のコマンドを実行してください：

```bash
pnpm wrangler deploy
```

Wrangler CLIが正しくインストール・設定されていること、および適切なCloudflareアカウント権限を持っていることを確認してください。デプロイが成功すると、TwitterボットはCloudflareプラットフォーム上で動作します。

---

## 🚀 ローカル開発

### 1. リポジトリをクローン

```bash
git clone https://github.com/AIGC-Hackers/picadabra-chat2design-Xbot.git
cd picadabra-chat2design-Xbot
```

### 2. 依存関係をインストール

```bash
pnpm install
```

### 3. .dev.varsファイル作成

`.dev.vars.example`を参考に.dev.varsファイルを作成:

```bash
# Twitter API認証情報
TWITTER_USER_ID=your_twitter_user_id
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_REFRESH_TOKEN=your_twitter_refresh_token
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret

# AI APIキー
GEMINI_API_KEY=your_gemini_api_key
GPT_API_KEY=your_openai_gpt_api_key

# R2ストレージ
R2_PUBLIC_URL=https://your-r2-bucket-url.example.com
```

### 4. ローカルD1データベース作成

ローカル開発用D1 DB作成コマンド：

```bash
pnpm run db:local
```

### 5. Twitter API認証情報取得

1. [Twitter Developer Portal](https://developer.x.com/en/portal/dashboard)でアプリ登録
2. CLIENT_IDとCLIENT_SECRETを取得
3. ローカル認証サーバー実行:

```bash
pnpm run local-server
```

### 6. ローカル開発サーバー起動

```bash
pnpm dev
```

---

## 🛠️ 設定

- AIプロバイダー: OpenAIかGeminiを簡単に切り替え。
- 画像バックエンド: カスタムAPI（Replicate、Stable Diffusionなど）を接続可能。
- プロンプトロジック: AIに送信前のテキスト解析方法を変更。

---

## 🤝 コントリビューション

コントリビューション（貢献）大歓迎！特に以下の改善があると嬉しいです：

1. 安定性向上
2. デザイン機能強化
3. 統合機能拡張

参加の流れ：

1. 🍴 まずリポジトリをフォーク
2. 🔧 機能ブランチ作成：`git checkout -b new-feature`
3. ✅ 変更をコミット： `git commit -am 'Add new feature`
4. 🚀 ブランチにプッシュ： `git push origin new-feature`
5. 🔁 プルリクを作成！

---

## 📄 ライセンス

MIT ライセンス

---

## 🌐 リンク

🔗 ライブボット: https://x.com/picadabra
🌍 ウェブサイト: https://a1d.ai
🧑‍💻 作者: @sharqwy, @Deniffer_001

a1d.aiチームによる💬 + 🎨のプロダクト

---

## 📚 ドキュメント

本プロジェクトで使用されている技術に関する詳細情報：

- [Cloudflare Workflows Guide](https://developers.cloudflare.com/workflows/get-started/guide/)
- [Cloudflare Workers API](https://developers.cloudflare.com/workflows/build/workers-api/)
- [Cloudflare Workflows Rules](https://developers.cloudflare.com/workflows/build/rules-of-workflows/)


