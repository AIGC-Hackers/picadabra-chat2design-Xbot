# Picadabra 🧙‍♂️✨ – Chat-to-Design X Bot

[English](README.md) | [中文](README_CN.md)

Picadabra is an open-source Twitter bot that transforms text prompts into stunning visuals using generative AI. Built with the power of **Gemini** or **ChatGPT-4o**, it lets users create or edit images simply by tweeting at the bot.

👉 Try it live: [@picadabra on Twitter](https://x.com/picadabra)

---

## ✨ Features

- 🧠 Natural language to design: Turn tweets into design actions.
- 🖼️ AI image generation & editing (e.g., background removal, enhancement, surreal edits).
- 🤖 Powered by Gemini or ChatGPT-4o APIs.
- 🐦 Twitter integration for seamless interaction.
- 🔧 Easily customizable and extensible.

---

## 📸 Example

Tweet:

> "@picadabra make the wall behind me black like the one in the second image"

Response:
➡️ A generated image with the requested edit.

---

## ⚡ Deploy to Cloudflare

This project is specifically designed for the Cloudflare platform, utilizing the following Cloudflare services:

1. **Cloudflare Workers** - For running serverless code
2. **Cloudflare Workflows** - For handling tweet processing and image generation workflows
3. **Cloudflare KV** - Key-value storage
4. **Cloudflare R2** - Object storage (for storing images)
5. **Cloudflare D1** - SQL database

### Deployment Steps:

#### 1. Create Required Resources in Cloudflare Console

- Create an R2 bucket
- Create a KV namespace
- Create a Worker resource

Alternatively, you can use the Wrangler CLI commands to create these resources:

```bash
# Create KV namespace
wrangler kv:namespace create "KV"
# Example output:
# 🌀 Creating namespace with title "twitter-chat2design-KV"
# ✨ Success! Created namespace with ID "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Create R2 bucket
wrangler r2 bucket create twitter-bot
# Example output:
# ✨ Created bucket twitter-bot

# Create D1 database
wrangler d1 create twitter-bot
# Example output:
# ✅ Created database 'twitter-bot' with ID <database_id>
```

#### 2. Create Remote D1 Database

```bash
pnpm run db:remote
```

This uses a script to create the remote database. To use the Wrangler CLI directly:

```bash
# Execute SQL migration on the remote D1 database
wrangler d1 execute twitter-bot --file src/db/migrations/0000_premium_lightspeed.sql --remote
# Example output:
# ✅ Executed SQL on database twitter-bot (xxxxx)
# ➤ 1 tables created.
```

#### 3. Update wrangler.jsonc

Edit the `wrangler.jsonc` file, ensuring you configure the correct:

- Cloudflare account ID
- KV namespace ID
- R2 bucket name
- D1 database ID

#### 4. Get and Update Twitter API Tokens

1. Register and create an application on the [Twitter Developer Portal](https://developer.x.com/en/portal/dashboard)
2. Obtain the `CLIENT_ID` and `CLIENT_SECRET`, and update this vars in `.env`
3. Run the local authentication server to get access tokens:

```bash
pnpm run local-server
```

Follow the prompts to authorize and obtain the latest AccessToken and RefreshToken.

#### 5. Update secrets.json

Create and update the `secrets.json` file (reference `secrets.example.json`), ensuring you enter the correct:

- Twitter credentials
- API keys
- R2 public URL

#### 6. Push Secrets to Cloudflare

```bash
pnpm run secrets:push
```

This uses a script to push the contents of secrets.json to Cloudflare. If you want to use the Wrangler CLI directly, you can run:

```bash
# Bulk push all secrets from secrets.json
pnpm wrangler secret bulk secrets.json
# Example output:
# ✨ Success! Uploaded 8 secret values
```

#### 7. Deploy the Application

```bash
pnpm run deploy
```

This uses a script to deploy the application. To use the Wrangler CLI directly:

```bash
# Deploy application to Cloudflare Workers
pnpm wrangler deploy
# Example output:
# ✨ Successfully deployed worker to https://twitter-chat2design.your-user.workers.dev
```

Ensure you have installed and configured the Wrangler CLI and have appropriate Cloudflare account permissions. After successful deployment, your Twitter bot will be running on the Cloudflare platform.

---

## 🚀 Local Development

### 1. Clone the Repo

```bash
git clone https://github.com/AIGC-Hackers/picadabra-chat2design-Xbot.git
cd picadabra-chat2design-Xbot
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Create .dev.vars File

Create a `.dev.vars` file in the project root directory, referencing `.dev.vars.example`:

```bash
# Twitter API credentials
TWITTER_USER_ID=your_twitter_user_id
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_REFRESH_TOKEN=your_twitter_refresh_token
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret

# AI API keys
GEMINI_API_KEY=your_gemini_api_key
GPT_API_KEY=your_openai_gpt_api_key

# R2 storage
R2_PUBLIC_URL=https://your-r2-bucket-url.example.com
```

### 4. Create Local D1 Database

Run the following command to create a D1 database for local development:

```bash
pnpm run db:local
```

### 5. Get Twitter API Authentication Credentials

1. Register and create an application on the [Twitter Developer Portal](https://developer.x.com/en/portal/dashboard)
2. Obtain the `CLIENT_ID` and `CLIENT_SECRET`
3. Run the local authentication server to get access tokens:

```bash
pnpm run local-server
```

4. Follow the prompts to authorize and obtain `ACCESS_TOKEN` and `REFRESH_TOKEN`
5. Update these tokens in your `.dev.vars` file

### 6. Start the Local Development Server

```bash
pnpm dev
```

You should now see the Twitter bot service running locally.

---

## 🛠️ Configuration

- AI provider: Easily switch between OpenAI or Gemini.
- Image backend: Plug in custom APIs (e.g., Replicate, Stable Diffusion).
- Prompt logic: Modify how text is parsed or structured before being sent to the AI.

---

## 🤝 Contributing

Pull requests are welcome! Contributions that improve stability, design capabilities, or integrations are especially appreciated.

How to contribute:

1. 🍴 Fork this repo
2. 🔧 Create a feature branch: `git checkout -b new-feature`
3. ✅ Commit your changes: `git commit -am 'Add new feature'`
4. 🚀 Push to the branch: `git push origin new-feature`
5. 🔁 Create a new Pull Request

---

## 📄 License

MIT License

---

## 🌐 Links

- 🔗 Live Bot: https://x.com/picadabra
- 🌍 Website: https://a1d.ai
- 🧑‍💻 Authors: @sharqwy, @Deniffer_001

Built with 💬 + 🎨 by a1d.ai team

---

## 📚 Documentation

For more information on the technologies used in this project:

- [Cloudflare Workflows Guide](https://developers.cloudflare.com/workflows/get-started/guide/)
- [Cloudflare Workers API](https://developers.cloudflare.com/workflows/build/workers-api/)
- [Cloudflare Workflows Rules](https://developers.cloudflare.com/workflows/build/rules-of-workflows/)

---

## 🏗️ System Architecture

Picadabra is built with a scalable, serverless architecture leveraging Cloudflare's ecosystem. Here's a breakdown of the system components:

### 1. High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│                 │    │                 │    │                 │
│  Twitter API    │◄───┤  Cloudflare     │◄───┤  AI Services    │
│  Integration    │    │  Workers        │    │  (Gemini/GPT-4) │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        ▲                      │                     ▲
        │                      ▼                     │
        │               ┌─────────────────┐          │
        │               │                 │          │
        └───────────────┤  Workflows &    ├──────────┘
                        │  Processing     │
                        │                 │
                        └─────────────────┘
                                │
                                ▼
                  ┌───────────────────────────┐
                  │                           │
                  │  Storage (KV, R2, D1)     │
                  │                           │
                  └───────────────────────────┘
```

### 2. Core Components

#### Twitter Integration Layer

- **Twitter API Client**: Handles authentication, tweet fetching, and replies
- **Webhook Handler**: Processes incoming mentions and events
- **OAuth Flow**: Manages Twitter authentication and token refresh

#### Processing Pipeline

- **Workflow Orchestration**: Managed by Cloudflare Workflows
- **Task Management**: Tracks and maintains state of processing tasks
- **Rate Limiting**: Prevents abuse and ensures fair usage

#### AI Services

- **Gemini Integration**: Processes text prompts and generates image modifications
- **GPT Integration**: Alternative AI backend for text understanding
- **Image Processing**: Handles image transformations based on natural language

#### Storage Layer

- **D1 Database**: SQL storage for task tracking and user data
- **KV Store**: Fast key-value store for caching and configuration
- **R2 Storage**: Object storage for images and media files

### 3. Request Flow

1. **Tweet Detection**:

   - User mentions @picadabra with a prompt
   - Twitter webhook notifies the application

2. **Task Creation**:

   - System creates a processing task
   - Task is queued in the workflow

3. **AI Processing**:

   - Text is analyzed by AI (Gemini/GPT)
   - AI generates or modifies images based on prompt
   - Results are stored in R2

4. **Response**:
   - System posts a reply tweet with the generated image
   - Task is marked as complete

### 4. Scalability & Performance

- **Serverless Architecture**: Automatically scales with demand
- **Edge Computing**: Deployed globally for low-latency responses
- **Asynchronous Processing**: Handles multiple requests concurrently
- **Resilient Workflow**: Includes retry mechanisms for transient failures

This architecture ensures Picadabra can handle varying loads while maintaining reliability and performance across global users.
