import fs from "fs";
import path from "path";
import { env } from "../config/env.js";

const logsDirectory = path.resolve(process.cwd(), "logs");

if (!fs.existsSync(logsDirectory)) {
  fs.mkdirSync(logsDirectory, { recursive: true });
}

function writeLine(filename, line) {
  fs.appendFile(path.join(logsDirectory, filename), `${line}\n`, () => {});
}

export const requestLogStream = {
  write(message) {
    writeLine("requests.log", `${new Date().toISOString()} [${env.instanceId}] ${message.trimEnd()}`);
  }
};

export function logAppEvent(level, message, metadata = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    instanceId: env.instanceId,
    level,
    message,
    metadata
  };

  writeLine("app.log", JSON.stringify(payload));
}

export { logsDirectory };
