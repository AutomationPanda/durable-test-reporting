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
`);

export type SuiteRun = {
  suiteUuid: string;
  suiteName: string;
  startTime: string;
  endTime: string | null;
};

export function listSuiteRuns(): SuiteRun[] {
  return db
    .prepare(
      `SELECT suite_uuid AS suiteUuid,
              suite_name AS suiteName,
              start_time AS startTime,
              end_time AS endTime
       FROM suites
       ORDER BY start_time DESC`
    )
    .all() as SuiteRun[];
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
