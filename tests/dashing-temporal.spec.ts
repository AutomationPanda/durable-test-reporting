import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { DashingTemporalPublisher } from "./support/dashingTemporalPublisher";
import {
  readRunSuiteIdOrFresh,
  tryClaimSuiteStartEmit,
} from "./support/playwrightRunSuiteId";

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
 * | `beforeAll` | One **suite** per Playwright run: stable `suiteUuid` from `globalSetup` (see `playwrightRunSuiteId.ts`); only the first worker emits `suite_start`. |
 * | `beforeEach` | Each Playwright **test** is one logical test case: `test_case_start` with the Playwright test title. |
 * | `afterEach`  | When the test body finishes, `test_case_end` with **pass** or **fail** from Playwright’s outcome. |
 * | `afterAll`   | `suite_end` so the Temporal workflow can complete after all cases are reported. |
 *
 * **`test.describe.configure({ mode: 'default' })`** — overrides the repo’s `fullyParallel` for
 * this block so tests run **in declaration order** on one worker, which keeps the shared
 * `suiteUuid` / `publisher` / `currentCaseUuid` hooks coherent (one Temporal suite, sensible signal
 * order). This is **not** `mode: 'serial'` (serial skips remaining tests after the first failure).
 *
 * Tests use only **`data:` URLs** (no app server, no Dashing UI) so they stay offline-friendly.
 */
test.describe("Durable publish via Temporal (hook-shaped)", () => {
  test.describe.configure({ mode: "default" });

  /** Suite UUID for this Playwright run (all workers) — matches one Temporal workflow id. */
  let suiteUuid: string;
  let suiteName: string;
  /** Temporal client + workflow handle; created in `beforeAll`. */
  let publisher: DashingTemporalPublisher | null = null;
  /** Per–test-case UUID for the current `test()`; set in `beforeEach`, cleared in `afterEach`. */
  let currentCaseUuid: string | null = null;

  test.beforeAll(async ({}, testInfo) => {
    test.skip(
      !temporalReachable,
      "Start Temporal and `npm run temporal:dev` (worker) to run this describe."
    );

    const rootDir = testInfo.config.rootDir;
    suiteUuid = readRunSuiteIdOrFresh(rootDir);
    suiteName = `Playwright Temporal ${suiteUuid.slice(0, 8)}`;
    publisher = await DashingTemporalPublisher.connect({ suiteUuid });

    // First worker only: after a failed test Playwright recycles the worker and runs `beforeAll`
    // again; the suite id must stay the same and `suite_start` must not be duplicated.
    if (tryClaimSuiteStartEmit(rootDir)) {
      await publisher.emit({
        type: "suite_start",
        suiteUuid,
        suiteName,
        startTime: new Date().toISOString(),
      });
    }
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

  test("renders a static paragraph for baseline", async ({ page }) => {
    await page.goto(
      "data:text/html;charset=utf-8,<p id=\"baseline\">ready</p>"
    );
    await expect(page.locator("#baseline")).toHaveText("ready");
  });

  test("renders a second isolated paragraph", async ({ page }) => {
    await page.goto(
      "data:text/html;charset=utf-8,<p id=\"iso\">isolated</p>"
    );
    await expect(page.locator("#iso")).toHaveText("isolated");
  });

  test("increments a button label from zero to one", async ({ page }) => {
    await page.goto(
      'data:text/html;charset=utf-8,<button id="ctr">0</button><script>document.getElementById("ctr").onclick=function(){this.textContent=String(1+Number(this.textContent))}</script>'
    );
    await page.locator("#ctr").click();
    await expect(page.locator("#ctr")).toHaveText("1");
  });

  test("reads the second item in a static list", async ({ page }) => {
    await page.goto(
      "data:text/html;charset=utf-8,<ul><li>one</li><li>two</li></ul>"
    );
    await expect(page.getByRole("listitem").nth(1)).toHaveText("two");
  });

  test("demonstrates a failing assertion for Dashing", async ({ page }) => {
    // Fails on purpose so `afterEach` emits test_case_end with testResult `fail` to Dashing.
    await page.goto(
      "data:text/html;charset=utf-8,<p id=\"bad\">actual</p>"
    );
    await expect(page.locator("#bad")).toHaveText("not what is rendered");
  });

  test("recovers with a passing check after a failed sibling", async ({ page }) => {
    await page.goto(
      "data:text/html;charset=utf-8,<p id=\"recover\">ok</p>"
    );
    await expect(page.locator("#recover")).toHaveText("ok");
  });
});
