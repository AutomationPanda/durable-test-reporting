import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

/** Ephemeral run artifacts (not under `test-results/`, which Playwright may clear). */
const DASHING_PLAYWRIGHT_DIR = ".dashing-playwright";
const RUN_SUITE_ID_FILE = "run-suite-id";
const SUITE_START_LOCK_FILE = "suite-start.lock";

function dashingPlaywrightDir(rootDir: string): string {
  return path.join(rootDir, DASHING_PLAYWRIGHT_DIR);
}

export function runSuiteIdPath(rootDir: string): string {
  return path.join(dashingPlaywrightDir(rootDir), RUN_SUITE_ID_FILE);
}

function suiteStartLockPath(rootDir: string): string {
  return path.join(dashingPlaywrightDir(rootDir), SUITE_START_LOCK_FILE);
}

/** Called from Playwright `globalSetup` once per test run (before any workers). */
export function writeRunSuiteIdForGlobalSetup(rootDir: string): string {
  const id = randomUUID();
  const dir = dashingPlaywrightDir(rootDir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, RUN_SUITE_ID_FILE), id, "utf-8");
  return id;
}

/**
 * Suite UUID shared by all workers in this Playwright invocation. Falls back to a fresh UUID
 * if `globalSetup` did not run (e.g. ad-hoc tooling importing this file).
 */
export function readRunSuiteIdOrFresh(rootDir: string): string {
  const p = runSuiteIdPath(rootDir);
  if (existsSync(p)) {
    return readFileSync(p, "utf-8").trim();
  }
  return randomUUID();
}

/**
 * First worker to create the lock file must emit `suite_start`. After a failure Playwright spawns
 * a new worker and runs `beforeAll` again; that worker must not send a second `suite_start` for
 * the same Temporal workflow / Dashing suite.
 */
export function tryClaimSuiteStartEmit(rootDir: string): boolean {
  const lock = suiteStartLockPath(rootDir);
  mkdirSync(path.dirname(lock), { recursive: true });
  try {
    const fd = openSync(
      lock,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
      0o644
    );
    closeSync(fd);
    return true;
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "EEXIST") {
      return false;
    }
    throw e;
  }
}

/** Remove run id + lock so the next `npx playwright test` run gets a clean slate. */
export function clearPlaywrightDashingRunArtifacts(rootDir: string): void {
  const dir = dashingPlaywrightDir(rootDir);
  try {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
  } catch {
    // ignore
  }
}
