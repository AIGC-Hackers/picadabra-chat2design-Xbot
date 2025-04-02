# Picadabra 🧙‍♂️✨ – 对话式设计 X 机器人

[English](README.md) | [中文](README_CN.md)

Picadabra 是一个开源的 Twitter 机器人，它利用生成式 AI 将文本提示转换为精美的视觉效果。通过 **Gemini** 或 **ChatGPT-4o** 的强大功能，用户只需向机器人发推文即可创建或编辑图像。

👉 立即体验：[@picadabra on Twitter](https://x.com/picadabra)

---

## ✨ 特点

- 🧠 自然语言转设计：将推文转化为设计操作。
- 🖼️ AI 图像生成和编辑（例如，背景移除、增强、超现实编辑）。
- 🤖 由 Gemini 或 ChatGPT-4o API 提供支持。
- 🐦 无缝集成 Twitter 交互。
- 🔧 易于定制和扩展。

---

## 📸 示例

推文：

> "@picadabra 将我身后的墙变成黑色，就像第二张图片中的那样"

回应：
➡️ 一张按照要求编辑的生成图像。

---

## ⚡ 部署到 Cloudflare

本项目专为 Cloudflare 平台设计，利用了以下 Cloudflare 服务：

1. **Cloudflare Workers** - 运行无服务器代码
2. **Cloudflare Workflows** - 处理推文和图像生成的工作流程
3. **Cloudflare KV** - 键值存储
4. **Cloudflare R2** - 对象存储（用于保存图像）
5. **Cloudflare D1** - SQL 数据库

### 部署步骤：

#### 1. 在 Cloudflare 控制台创建必要的资源

- 创建 R2 存储桶
- 创建 KV 命名空间
- 创建 Worker 资源

或者，你也可以使用 Wrangler CLI 命令创建这些资源：

```bash
# 创建 KV 命名空间
wrangler kv:namespace create "KV"
# 输出示例:
# 🌀 Creating namespace with title "twitter-chat2design-KV"
# ✨ Success! Created namespace with ID "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# 创建 R2 存储桶
wrangler r2 bucket create twitter-bot
# 输出示例:
# ✨ Created bucket twitter-bot

# 创建 D1 数据库
wrangler d1 create twitter-bot
# 输出示例:
# ✅ Created database 'twitter-bot' with ID <database_id>
```

#### 2. 创建远程 D1 数据库

```bash
pnpm run db:remote
```

这是使用脚本创建远程数据库。直接使用 Wrangler CLI 的方式如下：

```bash
# 执行远程D1数据库的SQL迁移
wrangler d1 execute twitter-bot --file src/db/migrations/0000_premium_lightspeed.sql --remote
# 输出示例:
# ✅ Executed SQL on database twitter-bot (xxxxx)
# ➤ 1 tables created.
```

#### 3. 更新 wrangler.jsonc

编辑 `wrangler.jsonc` 文件，确保配置了正确的：

- Cloudflare 账户 ID
- KV 命名空间 ID
- R2 存储桶名称
- D1 数据库 ID

#### 4. 获取并更新 Twitter API 令牌

1. 在 [Twitter Developer Portal](https://developer.x.com/en/portal/dashboard) 注册并创建应用
2. 获取 `CLIENT_ID` 和 `CLIENT_SECRET`, 更新.env 的变量
3. 运行本地认证服务器获取访问令牌：

```bash
pnpm run local-server
```

按照提示授权，获取最新的 AccessToken 和 RefreshToken。

#### 5. 更新 secrets.json

创建并更新 `secrets.json` 文件，可以参考 `secrets.example.json`，确保填入正确的：

- Twitter 凭证
- API 密钥
- R2 公共 URL

#### 6. 推送密钥到 Cloudflare

```bash
pnpm run secrets:push
```

这是使用脚本将 secrets.json 中的内容推送到 Cloudflare。如果想直接使用 Wrangler CLI，可以执行：

```bash
# 批量推送 secrets.json 中的所有密钥
wrangler secret bulk secrets.json
# 输出示例:
# ✨ Success! Uploaded 8 secret values
```

#### 7. 部署应用

```bash
pnpm run deploy
```

这是使用脚本部署应用。如果直接使用 Wrangler CLI，可以执行：

```bash
# 部署应用到Cloudflare Workers
wrangler deploy
# 输出示例:
# ✨ Successfully deployed worker to https://twitter-chat2design.your-user.workers.dev
```

确保你已经安装和配置了 Wrangler CLI，并拥有适当的 Cloudflare 帐户权限。成功部署后，你的 Twitter 机器人将在 Cloudflare 平台上运行。

---

## 🚀 本地开发

### 1. 克隆仓库

```bash
git clone https://github.com/AIGC-Hackers/picadabra-chat2design-Xbot.git
cd picadabra-chat2design-Xbot
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 创建 .dev.vars 文件

在项目根目录创建 `.dev.vars` 文件，可以参考 `.dev.vars.example`：

```bash
# Twitter API 凭证
TWITTER_USER_ID=your_twitter_user_id
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_REFRESH_TOKEN=your_twitter_refresh_token
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret

# AI API 密钥
GEMINI_API_KEY=your_gemini_api_key
GPT_API_KEY=your_openai_gpt_api_key

# R2 存储
R2_PUBLIC_URL=https://your-r2-bucket-url.example.com
```

### 4. 创建本地 D1 数据库

执行以下命令创建本地开发用的 D1 数据库：

```bash
pnpm run db:local
```

### 5. 获取 Twitter API 认证凭据

1. 在 [Twitter Developer Portal](https://developer.x.com/en/portal/dashboard) 注册并创建应用
2. 获取 `CLIENT_ID` 和 `CLIENT_SECRET`
3. 运行本地认证服务器获取访问令牌：

```bash
pnpm run local-server
```

4. 按照提示进行授权，获取 `ACCESS_TOKEN` 和 `REFRESH_TOKEN`
5. 将获取的令牌更新到 `.dev.vars` 文件中

### 6. 启动本地开发服务器

```bash
pnpm dev
```

现在你应该能在本地看到正在运行的 Twitter 机器人服务。

---

## 🛠️ 配置

- AI 提供商：轻松在 OpenAI 或 Gemini 之间切换。
- 图像后端：插入自定义 API（例如 Replicate、Stable Diffusion）。
- 提示逻辑：修改文本在发送到 AI 之前的解析或结构方式。

---

## 🤝 贡献

欢迎提交拉取请求！特别欢迎那些能改善稳定性、设计功能或集成的贡献。

如何贡献：

1. 🍴 Fork 此仓库
2. 🔧 创建功能分支：`git checkout -b new-feature`
3. ✅ 提交你的更改：`git commit -am 'Add new feature'`
4. 🚀 推送到分支：`git push origin new-feature`
5. 🔁 创建一个新的拉取请求

---

## 📄 许可证

MIT 许可证

---

## 🌐 链接

- 🔗 在线机器人：https://x.com/picadabra
- 🌍 网站：https://a1d.ai
- 🧑‍💻 作者：@sharqwy, @Deniffer_001

由 a1d.ai 团队 💬 + 🎨 打造

---

## 📚 文档

有关本项目使用的技术的更多信息：

- [Cloudflare Workflows 指南](https://developers.cloudflare.com/workflows/get-started/guide/)
- [Cloudflare Workflows API](https://developers.cloudflare.com/workflows/build/workers-api/)
- [Cloudflare Workflows 规则](https://developers.cloudflare.com/workflows/build/rules-of-workflows/)
