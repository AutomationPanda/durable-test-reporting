import * as wf from "@temporalio/workflow";
import type { publishDashingEvent } from "./activities.js";
import type { DashingEvent } from "./dashingEvent.js";

const { publishDashingEvent: publish } = wf.proxyActivities<{
  publishDashingEvent: typeof publishDashingEvent;
}>({
  startToCloseTimeout: "2 minutes",
  retry: {
    initialInterval: "1s",
    backoffCoefficient: 2,
    maximumInterval: "1 minute",
    maximumAttempts: 100,
  },
});

export const dashingEventSignal = wf.defineSignal<[DashingEvent]>("dashingEvent");

/**
 * One workflow per suite run: signals enqueue events; activities POST to Dashing
 * with retries until success. Completes after `suite_end` is delivered (and any
 * events already queued after it are flushed).
 */
export async function dashingSuitePublishWorkflow(): Promise<void> {
  const queue: DashingEvent[] = [];

  wf.setHandler(dashingEventSignal, (evt: DashingEvent) => {
    queue.push(evt);
  });

  for (;;) {
    await wf.condition(() => queue.length > 0);
    while (queue.length > 0) {
      const evt = queue.shift() as DashingEvent;
      await publish(evt);
      if (evt.type === "suite_end") {
        while (queue.length > 0) {
          await publish(queue.shift() as DashingEvent);
        }
        return;
      }
    }
  }
}
