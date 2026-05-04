import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { DashingTemporalPublisher } from "./support/dashingTemporalPublisher";

const DASHING_API =
  process.env.DASHING_API_URL ?? "http://127.0.0.1:3000";

let temporalReachable = false;

test.beforeAll(async () => {
  const { Connection } = await import("@temporalio/client");
  try {
    const c = await Connection.connect({
      address: process.env.TEMPORAL_ADDRESS ?? "127.0.0.1:7233",
    });
    await c.close();
    temporalReachable = true;
  } catch {
    temporalReachable = false;
  }
});

test.describe("Durable publish via Temporal", () => {
  test("suite and test events reach Dashing", async () => {
    test.skip(
      !temporalReachable,
      "Start Temporal (e.g. temporal server start-dev) and the temporal-worker package (npm run temporal:dev) to run this test."
    );

    const suiteUuid = randomUUID();
    const testUuid = randomUUID();
    const suiteName = `Playwright Temporal ${suiteUuid.slice(0, 8)}`;
    const t0 = new Date().toISOString();

    const publisher = await DashingTemporalPublisher.connect({ suiteUuid });

    try {
      await publisher.emit({
        type: "suite_start",
        suiteUuid,
        suiteName,
        startTime: t0,
      });
      await publisher.emit({
        type: "test_case_start",
        testUuid,
        suiteUuid,
        testName: "Temporal path smoke",
        startTime: t0,
      });
      await publisher.emit({
        type: "test_case_end",
        testUuid,
        endTime: new Date().toISOString(),
        testResult: "pass",
      });
      await publisher.emit({
        type: "suite_end",
        suiteUuid,
        endTime: new Date().toISOString(),
      });

      const deadline = Date.now() + 60_000;
      let found = false;
      while (Date.now() < deadline) {
        const res = await fetch(`${DASHING_API}/api/suites`);
        expect(res.ok).toBeTruthy();
        const body = (await res.json()) as {
          suites: Array<{ suiteUuid: string; suiteName: string }>;
        };
        found = body.suites.some((s) => s.suiteUuid === suiteUuid);
        if (found) {
          break;
        }
        await new Promise((r) => setTimeout(r, 500));
      }

      expect(found, "suite should appear in Dashing after Temporal delivery").toBe(
        true
      );

      const detail = await fetch(
        `${DASHING_API}/api/suites/${encodeURIComponent(suiteUuid)}/tests`
      );
      expect(detail.ok).toBeTruthy();
      const detailJson = (await detail.json()) as {
        tests: Array<{ testUuid: string }>;
      };
      expect(detailJson.tests.some((t) => t.testUuid === testUuid)).toBe(true);
    } finally {
      await publisher.close();
    }
  });
});
