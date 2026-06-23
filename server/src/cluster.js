import cluster from "cluster";
import os from "os";

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
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
