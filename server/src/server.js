import { createApp } from "./app.js";
import { connectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { logAppEvent } from "./services/logger.service.js";

async function bootstrap() {
  await connectDatabase();
  const app = createApp();

  app.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
    logAppEvent("info", "server_started", { port: env.port });
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  logAppEvent("error", "server_start_failed", { error: error.message });
  process.exit(1);
});
