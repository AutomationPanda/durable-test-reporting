import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NativeConnection, Worker } from "@temporalio/worker";
import * as activities from "./activities.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveWorkflowsPath(): string {
  const js = path.join(__dirname, "workflows.js");
  if (fs.existsSync(js)) {
    return js;
  }
  return path.join(__dirname, "workflows.ts");
}

const address: string = process.env.TEMPORAL_ADDRESS ?? "127.0.0.1:7233";
const namespace: string = process.env.TEMPORAL_NAMESPACE ?? "default";
const taskQueue: string = process.env.TEMPORAL_TASK_QUEUE ?? "dashing-publish";

const maxConnectAttempts: number = Math.max(
  1,
  Number(process.env.TEMPORAL_CONNECT_RETRIES ?? "15")
);
const connectRetryMs: number = Math.max(
  100,
  Number(process.env.TEMPORAL_CONNECT_RETRY_MS ?? "2000")
);

/** Thrown when SIGINT/SIGTERM arrives during connect retries (e.g. tsx watch restart). */
class ConnectInterrupted extends Error {
  override readonly name = "ConnectInterrupted";
  constructor() {
    super("Temporal connect retries cancelled (shutdown signal)");
  }
}

let shutdownRequested = false;

for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
  process.on(sig, () => {
    shutdownRequested = true;
  });
}

async function sleepInterruptible(ms: number): Promise<void> {
  const stepMs = 200;
  let remaining = ms;
  while (remaining > 0) {
    if (shutdownRequested) {
      throw new ConnectInterrupted();
    }
    const chunk = Math.min(stepMs, remaining);
    await new Promise<void>((resolve) => setTimeout(resolve, chunk));
    remaining -= chunk;
  }
  if (shutdownRequested) {
    throw new ConnectInterrupted();
  }
}

function printTemporalUnreachableHelp(): void {
  console.error(`
[temporal-worker] Cannot reach Temporal Server at ${address}
  (connection refused usually means nothing is listening on that port yet.)

  Start Temporal, then run this worker again:

    npm run temporal:up              # Docker
    temporal server start-dev        # Temporal CLI

  This worker uses namespace "${namespace}" (override with TEMPORAL_NAMESPACE).

  See README.md → "Run locally (Temporal durable publishing)".
`);
}

async function connectWithRetry(): Promise<NativeConnection> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxConnectAttempts; attempt++) {
    if (shutdownRequested) {
      throw new ConnectInterrupted();
    }
    try {
      return await NativeConnection.connect({ address });
    } catch (err) {
      lastErr = err;
      if (shutdownRequested) {
        throw new ConnectInterrupted();
      }
      if (attempt < maxConnectAttempts) {
        console.warn(
          `[temporal-worker] Connect to ${address} failed (${attempt}/${maxConnectAttempts}); retrying in ${connectRetryMs}ms…`
        );
        await sleepInterruptible(connectRetryMs);
      }
    }
  }
  printTemporalUnreachableHelp();
  throw lastErr;
}

async function run(): Promise<void> {
  const connection = await connectWithRetry();
  const worker = await Worker.create({
    connection,
    namespace,
    taskQueue,
    workflowsPath: resolveWorkflowsPath(),
    activities,
  });
  console.log(
    `Temporal worker listening on task queue "${taskQueue}" (${address}, ns=${namespace})`
  );
  await worker.run();
}

run().catch((err: unknown) => {
  if (err instanceof ConnectInterrupted) {
    process.exit(0);
  }
  console.error(err);
  process.exit(1);
});
