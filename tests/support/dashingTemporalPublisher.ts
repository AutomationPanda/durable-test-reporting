import { Client, Connection } from "@temporalio/client";
import type { DashingEvent } from "./dashingEvent";

const TASK_QUEUE = "dashing-publish";
const WORKFLOW_NAME = "dashingSuitePublishWorkflow";
const SIGNAL_NAME = "dashingEvent";

export type DashingTemporalPublisherOptions = {
  suiteUuid: string;
  temporalAddress?: string;
  namespace?: string;
};

/**
 * Sends result events through Temporal so the worker can POST them to Dashing
 * with activity retries (durable delivery).
 */
export class DashingTemporalPublisher {
  private readonly workflowId: string;
  private readonly connection: Connection;
  private client: Client | null = null;
  private started = false;

  constructor(
    connection: Connection,
    private readonly options: DashingTemporalPublisherOptions
  ) {
    this.connection = connection;
    this.workflowId = `dashing-publish-${options.suiteUuid}`;
  }

  static async connect(
    options: DashingTemporalPublisherOptions
  ): Promise<DashingTemporalPublisher> {
    const address: string =
      options.temporalAddress ??
      process.env.TEMPORAL_ADDRESS ??
      "127.0.0.1:7233";
    const connection = await Connection.connect({ address });
    return new DashingTemporalPublisher(connection, options);
  }

  private async getClient(): Promise<Client> {
    if (this.client === null) {
      this.client = new Client({
        connection: this.connection,
        namespace: this.options.namespace ?? "default",
      });
    }
    return this.client;
  }

  async emit(event: DashingEvent): Promise<void> {
    const client = await this.getClient();
    if (!this.started) {
      await client.workflow.signalWithStart(WORKFLOW_NAME, {
        taskQueue: TASK_QUEUE,
        workflowId: this.workflowId,
        signal: SIGNAL_NAME,
        signalArgs: [event],
        workflowRunTimeout: "4 hours",
        args: [],
      });
      this.started = true;
      return;
    }
    const handle = client.workflow.getHandle(this.workflowId);
    await handle.signal(SIGNAL_NAME, event);
  }

  async close(): Promise<void> {
    await this.connection.close();
    this.client = null;
  }
}
