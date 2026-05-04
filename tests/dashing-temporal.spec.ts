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

/**
 * This file demonstrates **durable** reporting to Dashing via Temporal in a shape
 * closer to real automation:
 *
 * - **Playwright** runs in this Node process and drives browsers / assertions as usual.
 * - **Temporal** runs the `dashingSuitePublishWorkflow` on a worker (separate process):
 *   it receives **signals** and turns each into an HTTP activity to Dashing.
 *
 * We tie lifecycle hooks to the **event model** from `specs/engineering/test-result-events.md`:
 *
 * | Hook        | Why / what we emit |
 * | ----------- | ------------------- |
 * | `beforeAll` | One **suite** per describe block: `suite_start` once the Temporal client is ready. |
 * | `beforeEach` | Each Playwright **test** is one logical test case: `test_case_start` with the Playwright test title. |
 * | `afterEach`  | When the test body finishes, `test_case_end` with **pass** or **fail** from Playwright’s outcome. |
 * | `afterAll`   | `suite_end` so the Temporal workflow can complete after all cases are reported. |
 *
 * `describe` is **serial** so hook order matches execution order (no interleaving of cases).
 */
test.describe("Durable publish via Temporal (hook-shaped)", () => {
  test.describe.configure({ mode: "serial" });

  /** Single suite UUID for the whole describe — matches one Temporal workflow id. */
  let suiteUuid: string;
  let suiteName: string;
  /** Temporal client + workflow handle; created in `beforeAll`. */
  let publisher: DashingTemporalPublisher | null = null;
  /** Per–test-case UUID for the current `test()`; set in `beforeEach`, cleared in `afterEach`. */
  let currentCaseUuid: string | null = null;

  test.beforeAll(async () => {
    test.skip(
      !temporalReachable,
      "Start Temporal and `npm run temporal:dev` (worker) to run this describe."
    );

    suiteUuid = randomUUID();
    suiteName = `Playwright Temporal ${suiteUuid.slice(0, 8)}`;
    publisher = await DashingTemporalPublisher.connect({ suiteUuid });

    // Real suites begin once: publish start so Dashing can show the run as in progress.
    await publisher.emit({
      type: "suite_start",
      suiteUuid,
      suiteName,
      startTime: new Date().toISOString(),
    });
  });

  test.beforeEach(async ({}, testInfo) => {
    // Each Playwright `test()` maps to one test case in Dashing; start before the body runs.
    currentCaseUuid = randomUUID();
    await publisher!.emit({
      type: "test_case_start",
      testUuid: currentCaseUuid,
      suiteUuid,
      testName: testInfo.title,
      startTime: new Date().toISOString(),
    });
  });

  test.afterEach(async ({}, testInfo) => {
    if (publisher === null || currentCaseUuid === null) {
      return;
    }

    // Mirror runner outcome: only `pass` / `fail` exist on the wire (see http-api.md).
    const testResult: "pass" | "fail" =
      testInfo.status === "passed" ? "pass" : "fail";

    await publisher.emit({
      type: "test_case_end",
      testUuid: currentCaseUuid,
      endTime: new Date().toISOString(),
      testResult,
    });
    currentCaseUuid = null;
  });

  test.afterAll(async () => {
    if (publisher === null) {
      return;
    }
    try {
      // Tells the workflow to drain and exit; Dashing marks the suite complete.
      await publisher.emit({
        type: "suite_end",
        suiteUuid,
        endTime: new Date().toISOString(),
      });
    } finally {
      await publisher.close();
      publisher = null;
    }
  });

  test("step A — minimal browser check", async ({ page }) => {
    await page.goto(
      "data:text/html;charset=utf-8,<p id=\"step-a\">step-a</p>"
    );
    await expect(page.locator("#step-a")).toHaveText("step-a");
  });

  test("step B — second case reuses same suite", async ({ page }) => {
    await page.goto(
      "data:text/html;charset=utf-8,<p id=\"step-b\">step-b</p>"
    );
    await expect(page.locator("#step-b")).toHaveText("step-b");
  });

  // test("Dashing API lists this suite and the browser steps", async () => {
  //   const deadline = Date.now() + 60_000;
  //   let foundSuite = false;
  //   while (Date.now() < deadline && !foundSuite) {
  //     const res = await fetch(`${DASHING_API}/api/suites`);
  //     expect(res.ok).toBeTruthy();
  //     const body = (await res.json()) as {
  //       suites: Array<{ suiteUuid: string }>;
  //     };
  //     foundSuite = body.suites.some((s) => s.suiteUuid === suiteUuid);
  //     if (!foundSuite) {
  //       await new Promise((r) => setTimeout(r, 500));
  //     }
  //   }
  //   expect(foundSuite, "suite row should exist after Temporal delivery").toBe(true);

  //   const detail = await fetch(
  //     `${DASHING_API}/api/suites/${encodeURIComponent(suiteUuid)}/tests`
  //   );
  //   expect(detail.ok).toBeTruthy();
  //   const detailJson = (await detail.json()) as {
  //     tests: Array<{ testName: string }>;
  //   };
  //   expect(detailJson.tests.length).toBeGreaterThanOrEqual(2);
  //   const titles = detailJson.tests.map((t) => t.testName);
  //   expect(titles.some((t) => t.includes("step A"))).toBe(true);
  //   expect(titles.some((t) => t.includes("step B"))).toBe(true);
  // });
});
