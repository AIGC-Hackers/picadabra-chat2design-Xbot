import { Hono } from "hono";
import type { Env } from "../../types";
import { registerProcessRoutes } from "./process";
import { registerTasksRoutes } from "./tasks";
import { registerMentionsRoutes } from "./mentions";

/**
 * Twitter processor routes
 * Integration of all Twitter processing related API endpoints
 */
const app = new Hono<{ Bindings: Env }>();

// Register task processing routes
registerProcessRoutes(app);

// Register task management routes
registerTasksRoutes(app);

// Register mentions management routes
registerMentionsRoutes(app);

export default app;
