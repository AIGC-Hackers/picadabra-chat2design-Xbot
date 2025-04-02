import { Hono } from "hono";
import { renderer } from "./renderer";
import geminiRoutes from "./routes/gemini";
import gptRoutes from "./routes/gpt";
import { ExecutionContext, ScheduledEvent } from "@cloudflare/workers-types";
import type { Env } from "./types";
import { refreshTwitterTokenScheduled } from "./scheduled/refresh-token-scheduler";
import { getUserMentionsScheduled } from "./scheduled/get-user-mentions-scheduler";
import twitterProcessorRoutes from "./routes/twitter-processor/index";
const app = new Hono<{ Bindings: Env }>();

app.use(renderer);

app.get("/", (c) => {
  return c.render(<h1>Hello Picadabra 🧙‍♂️✨</h1>);
});

/**
 *  @warning Register api routes, for test purposes only!!
 *  @warning Remove this before deploying to production
 */
app.route("/api/gemini", geminiRoutes);
app.route("/api/gpt", gptRoutes);
app.route("/api/twitter-processor", twitterProcessorRoutes);

const worker = {
  fetch: app.fetch.bind(app),
  scheduled: async (event: ScheduledEvent, env: Env, ctx: ExecutionContext) => {
    console.log("Running scheduled task:", event.cron);

    // Refresh access token every hour
    if (event.cron === "0 * * * *") {
      await refreshTwitterTokenScheduled(env);
    }

    // Get Twitter mentions every 2 minutes
    if (event.cron === "*/2 * * * *") {
      await getUserMentionsScheduled(env);
    }
  },
};

export { TwitterProcessorWorkflow } from "./workflows/twitter-processor";

export default worker;
