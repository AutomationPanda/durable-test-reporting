import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const dataDir: string = path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });

const dbPath: string = path.join(dataDir, "dashing.db");
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS suites (
    suite_uuid TEXT PRIMARY KEY NOT NULL,
    suite_name TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_suites_start_time ON suites (start_time DESC);

  CREATE TABLE IF NOT EXISTS test_cases (
    test_uuid TEXT PRIMARY KEY NOT NULL,
    suite_uuid TEXT NOT NULL,
    test_name TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    test_result TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_test_cases_suite_start
    ON test_cases (suite_uuid, start_time ASC);
`);

export type SuiteRun = {
  suiteUuid: string;
  suiteName: string;
  startTime: string;
  endTime: string | null;
  /** Rounded % of passed among completed tests; null when there are no completed tests. */
  passRatePercent: number | null;
};

export type TestCaseRun = {
  testUuid: string;
  suiteUuid: string;
  testName: string;
  startTime: string;
  endTime: string | null;
  testResult: "pass" | "fail" | null;
};

function passRatePercentForSuite(suiteUuid: string): number | null {
  const row = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN end_time IS NOT NULL THEN 1 ELSE 0 END), 0) AS completed,
         COALESCE(SUM(CASE WHEN test_result = 'pass' AND end_time IS NOT NULL THEN 1 ELSE 0 END), 0) AS passed
       FROM test_cases
       WHERE suite_uuid = ?`
    )
    .get(suiteUuid) as { completed: number; passed: number };
  return row.completed > 0
    ? Math.round((100 * row.passed) / row.completed)
    : null;
}

export function listSuiteRuns(): SuiteRun[] {
  const rows = db
    .prepare(
      `SELECT
         s.suite_uuid AS suiteUuid,
         s.suite_name AS suiteName,
         s.start_time AS startTime,
         s.end_time AS endTime,
         COALESCE(SUM(CASE WHEN t.end_time IS NOT NULL THEN 1 ELSE 0 END), 0) AS completed,
         COALESCE(SUM(CASE WHEN t.test_result = 'pass' AND t.end_time IS NOT NULL THEN 1 ELSE 0 END), 0) AS passed
       FROM suites s
       LEFT JOIN test_cases t ON t.suite_uuid = s.suite_uuid
       GROUP BY s.suite_uuid, s.suite_name, s.start_time, s.end_time
       ORDER BY s.start_time DESC`
    )
    .all() as Array<{
      suiteUuid: string;
      suiteName: string;
      startTime: string;
      endTime: string | null;
      completed: number;
      passed: number;
    }>;

  return rows.map((r) => ({
    suiteUuid: r.suiteUuid,
    suiteName: r.suiteName,
    startTime: r.startTime,
    endTime: r.endTime,
    passRatePercent:
      r.completed > 0 ? Math.round((100 * r.passed) / r.completed) : null,
  }));
}

export function getSuiteByUuid(suiteUuid: string): SuiteRun | null {
  const row = db
    .prepare(
      `SELECT suite_uuid AS suiteUuid,
              suite_name AS suiteName,
              start_time AS startTime,
              end_time AS endTime
       FROM suites
       WHERE suite_uuid = ?`
    )
    .get(suiteUuid) as
    | {
        suiteUuid: string;
        suiteName: string;
        startTime: string;
        endTime: string | null;
      }
    | undefined;
  if (row === undefined) {
    return null;
  }
  return {
    ...row,
    passRatePercent: passRatePercentForSuite(suiteUuid),
  };
}

export function listTestCasesForSuite(suiteUuid: string): TestCaseRun[] {
  return db
    .prepare(
      `SELECT test_uuid AS testUuid,
              suite_uuid AS suiteUuid,
              test_name AS testName,
              start_time AS startTime,
              end_time AS endTime,
              test_result AS testResult
       FROM test_cases
       WHERE suite_uuid = ?
       ORDER BY start_time ASC`
    )
    .all(suiteUuid) as TestCaseRun[];
}

export function recordSuiteStart(
  suiteUuid: string,
  suiteName: string,
  startTime: string
): void {
  db.prepare(
    `INSERT INTO suites (suite_uuid, suite_name, start_time, end_time)
     VALUES (?, ?, ?, NULL)
     ON CONFLICT(suite_uuid) DO NOTHING`
  ).run(suiteUuid, suiteName, startTime);
}

export function recordSuiteEnd(suiteUuid: string, endTime: string): void {
  db.prepare(`UPDATE suites SET end_time = ? WHERE suite_uuid = ?`).run(
    endTime,
    suiteUuid
  );
}

export function recordTestCaseStart(
  testUuid: string,
  suiteUuid: string,
  testName: string,
  startTime: string
): void {
  db.prepare(
    `INSERT INTO test_cases (test_uuid, suite_uuid, test_name, start_time, end_time, test_result)
     VALUES (?, ?, ?, ?, NULL, NULL)
     ON CONFLICT(test_uuid) DO NOTHING`
  ).run(testUuid, suiteUuid, testName, startTime);
}

export function recordTestCaseEnd(
  testUuid: string,
  endTime: string,
  testResult: "pass" | "fail"
): void {
  db.prepare(
    `UPDATE test_cases
     SET end_time = ?, test_result = ?
     WHERE test_uuid = ?`
  ).run(endTime, testResult, testUuid);
}

/** Deterministic demo rows for local UI; safe to re-run (INSERT OR IGNORE). */
export function seedDummySuites(): number {
  const now = Date.now();
  const minute = 60_000;
  const hour = 60 * minute;

  const rows: Array<{
    suiteUuid: string;
    suiteName: string;
    startTime: string;
    endTime: string | null;
  }> = [
    {
      suiteUuid: "d0000001-0000-4000-8000-000000000001",
      suiteName: "Checkout smoke",
      startTime: new Date(now - 4 * minute).toISOString(),
      endTime: null,
    },
    {
      suiteUuid: "d0000001-0000-4000-8000-000000000002",
      suiteName: "API contract pack",
      startTime: new Date(now - 38 * minute).toISOString(),
      endTime: new Date(now - 9 * minute).toISOString(),
    },
    {
      suiteUuid: "d0000001-0000-4000-8000-000000000003",
      suiteName: "Visual regression",
      startTime: new Date(now - 2 * hour).toISOString(),
      endTime: new Date(now - 95 * minute).toISOString(),
    },
    {
      suiteUuid: "d0000001-0000-4000-8000-000000000004",
      suiteName: "Unit — auth module",
      startTime: new Date(now - 5 * hour).toISOString(),
      endTime: new Date(now - 4 * hour - 50 * minute).toISOString(),
    },
    {
      suiteUuid: "d0000001-0000-4000-8000-000000000005",
      suiteName: "Nightly cross-browser",
      startTime: new Date(now - 26 * hour).toISOString(),
      endTime: new Date(now - 25 * hour - 20 * minute).toISOString(),
    },
  ];

  const stmt = db.prepare(
    `INSERT OR IGNORE INTO suites (suite_uuid, suite_name, start_time, end_time)
     VALUES (@suiteUuid, @suiteName, @startTime, @endTime)`
  );

  let inserted = 0;
  const run = db.transaction(() => {
    for (const row of rows) {
      inserted += stmt.run(row).changes;
    }
  });
  run();
  return inserted;
}

type SeedTestRow = {
  testUuid: string;
  suiteUuid: string;
  testName: string;
  startTime: string;
  endTime: string | null;
  testResult: "pass" | "fail" | null;
};

/** Demo test cases tied to dummy suite UUIDs; INSERT OR IGNORE. */
export function seedDummyTestCases(): number {
  const now = Date.now();
  const minute = 60_000;
  const second = 1000;

  const S1 = "d0000001-0000-4000-8000-000000000001";
  const S2 = "d0000001-0000-4000-8000-000000000002";
  const S3 = "d0000001-0000-4000-8000-000000000003";
  const S4 = "d0000001-0000-4000-8000-000000000004";
  const S5 = "d0000001-0000-4000-8000-000000000005";

  const base1 = now - 4 * minute;
  const base2 = now - 38 * minute;
  const base3 = now - 2 * 60 * minute;
  const base4 = now - 5 * 60 * minute;
  const base5 = now - 26 * 60 * minute;

  const rows: SeedTestRow[] = [
    {
      testUuid: "e0000001-0000-4000-8000-000000000101",
      suiteUuid: S1,
      testName: "Guest checkout happy path",
      startTime: new Date(base1 + 5 * second).toISOString(),
      endTime: new Date(base1 + 48 * second).toISOString(),
      testResult: "pass",
    },
    {
      testUuid: "e0000001-0000-4000-8000-000000000102",
      suiteUuid: S1,
      testName: "Promo code rejected for expired coupon",
      startTime: new Date(base1 + 52 * second).toISOString(),
      endTime: new Date(base1 + 2 * minute + 5 * second).toISOString(),
      testResult: "fail",
    },
    {
      testUuid: "e0000001-0000-4000-8000-000000000103",
      suiteUuid: S1,
      testName: "Signed-in user checkout with saved card",
      startTime: new Date(base1 + 2 * minute + 20 * second).toISOString(),
      endTime: null,
      testResult: null,
    },
    {
      testUuid: "e0000001-0000-4000-8000-000000000201",
      suiteUuid: S2,
      testName: "GET /health matches schema",
      startTime: new Date(base2 + 10 * second).toISOString(),
      endTime: new Date(base2 + 3 * minute).toISOString(),
      testResult: "pass",
    },
    {
      testUuid: "e0000001-0000-4000-8000-000000000202",
      suiteUuid: S2,
      testName: "POST /orders returns 422 on invalid body",
      startTime: new Date(base2 + 3 * minute + 15 * second).toISOString(),
      endTime: new Date(base2 + 8 * minute).toISOString(),
      testResult: "pass",
    },
    {
      testUuid: "e0000001-0000-4000-8000-000000000203",
      suiteUuid: S2,
      testName: "Pagination cursor contract",
      startTime: new Date(base2 + 8 * minute + 20 * second).toISOString(),
      endTime: new Date(base2 + 14 * minute).toISOString(),
      testResult: "fail",
    },
    {
      testUuid: "e0000001-0000-4000-8000-000000000204",
      suiteUuid: S2,
      testName: "Rate limit headers present",
      startTime: new Date(base2 + 14 * minute + 30 * second).toISOString(),
      endTime: new Date(base2 + 20 * minute).toISOString(),
      testResult: "pass",
    },
    {
      testUuid: "e0000001-0000-4000-8000-000000000301",
      suiteUuid: S3,
      testName: "Home hero snapshot",
      startTime: new Date(base3 + 30 * second).toISOString(),
      endTime: new Date(base3 + 12 * minute).toISOString(),
      testResult: "pass",
    },
    {
      testUuid: "e0000001-0000-4000-8000-000000000302",
      suiteUuid: S3,
      testName: "Settings modal dark mode",
      startTime: new Date(base3 + 12 * minute + 10 * second).toISOString(),
      endTime: new Date(base3 + 22 * minute).toISOString(),
      testResult: "fail",
    },
    {
      testUuid: "e0000001-0000-4000-8000-000000000401",
      suiteUuid: S4,
      testName: "loginWithToken issues session",
      startTime: new Date(base4 + 20 * second).toISOString(),
      endTime: new Date(base4 + 2 * minute).toISOString(),
      testResult: "pass",
    },
    {
      testUuid: "e0000001-0000-4000-8000-000000000402",
      suiteUuid: S4,
      testName: "refreshSession extends expiry",
      startTime: new Date(base4 + 2 * minute + 5 * second).toISOString(),
      endTime: new Date(base4 + 5 * minute).toISOString(),
      testResult: "pass",
    },
    {
      testUuid: "e0000001-0000-4000-8000-000000000403",
      suiteUuid: S4,
      testName: "revokeAll clears refresh cookies",
      startTime: new Date(base4 + 5 * minute + 10 * second).toISOString(),
      endTime: new Date(base4 + 11 * minute).toISOString(),
      testResult: "fail",
    },
    {
      testUuid: "e0000001-0000-4000-8000-000000000404",
      suiteUuid: S4,
      testName: "mfa challenge required for admin role",
      startTime: new Date(base4 + 11 * minute + 20 * second).toISOString(),
      endTime: new Date(base4 + 18 * minute).toISOString(),
      testResult: "pass",
    },
    {
      testUuid: "e0000001-0000-4000-8000-000000000405",
      suiteUuid: S4,
      testName: "password reset token single use",
      startTime: new Date(base4 + 18 * minute + 15 * second).toISOString(),
      endTime: new Date(base4 + 24 * minute).toISOString(),
      testResult: "pass",
    },
    {
      testUuid: "e0000001-0000-4000-8000-000000000501",
      suiteUuid: S5,
      testName: "Chromium — catalog grid",
      startTime: new Date(base5 + 2 * minute).toISOString(),
      endTime: new Date(base5 + 35 * minute).toISOString(),
      testResult: "pass",
    },
    {
      testUuid: "e0000001-0000-4000-8000-000000000502",
      suiteUuid: S5,
      testName: "Firefox — catalog grid",
      startTime: new Date(base5 + 35 * minute + 30 * second).toISOString(),
      endTime: new Date(base5 + 58 * minute).toISOString(),
      testResult: "pass",
    },
    {
      testUuid: "e0000001-0000-4000-8000-000000000503",
      suiteUuid: S5,
      testName: "WebKit — catalog grid",
      startTime: new Date(base5 + 58 * minute + 20 * second).toISOString(),
      endTime: new Date(base5 + 80 * minute).toISOString(),
      testResult: "fail",
    },
  ];

  const stmt = db.prepare(
    `INSERT OR IGNORE INTO test_cases (test_uuid, suite_uuid, test_name, start_time, end_time, test_result)
     VALUES (@testUuid, @suiteUuid, @testName, @startTime, @endTime, @testResult)`
  );

  let inserted = 0;
  const run = db.transaction(() => {
    for (const row of rows) {
      inserted += stmt.run(row).changes;
    }
  });
  run();
  return inserted;
}
