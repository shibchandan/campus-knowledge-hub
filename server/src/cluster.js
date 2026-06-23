import cluster from "cluster";
import os from "os";

if (cluster.isPrimary) {
  // Render's free tier has strict memory limits (512MB). Spawning a worker for every CPU
  // on the host machine will cause Out Of Memory (OOM) errors. 
  // We respect WEB_CONCURRENCY if set, otherwise default to 1 on Render, or max CPUs locally.
  let numCPUs = os.cpus().length;
  if (process.env.WEB_CONCURRENCY) {
    numCPUs = parseInt(process.env.WEB_CONCURRENCY, 10);
  } else if (process.env.RENDER) {
    numCPUs = 1; 
  }

  console.log(`[CLUSTER] Primary ${process.pid} is running`);
  console.log(`[CLUSTER] Forking ${numCPUs} workers...`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`[CLUSTER] Worker ${worker.process.pid} died with code: ${code}, and signal: ${signal}`);
    console.log("[CLUSTER] Starting a new worker...");
    cluster.fork();
  });
} else {
  // Workers can share any TCP connection
  // In this case, it is an HTTP server initialized in server.js
  import("./server.js");
}
