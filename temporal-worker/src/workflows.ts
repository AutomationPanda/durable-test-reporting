import * as wf from "@temporalio/workflow";
import type { publishDashingEvent } from "./activities.js";
import type { DashingEvent } from "./dashingEvent.js";

/**
 * Activities = side effects (HTTP). Retries and timeouts apply here only—not to
 * the signal handler below (workflow code must stay deterministic).
 */
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

/** Ingress: publishers send events here. Recorded in history; handler runs on replay. */
export const dashingEventSignal = wf.defineSignal<[DashingEvent]>("dashingEvent");

/**
 * One workflow per suite run: **signals** enqueue events (deterministic); **activities**
 * POST each event to Dashing with retries (at-least-once delivery to the API).
 *
 * Completes after `suite_end` is successfully published, then drains any signals
 * already queued after it. This workflow does not dedupe duplicate signals; see
 * `specs/engineering/temporal-publisher.md` (idempotency).
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
