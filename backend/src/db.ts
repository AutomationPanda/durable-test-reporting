import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const dataDir: string = path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });

const dbPath: string = path.join(dataDir, "dashing.db");
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS hello_visits (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    count INTEGER NOT NULL DEFAULT 0
  );
`);

const ensureRow = db.prepare(
  "INSERT OR IGNORE INTO hello_visits (id, count) VALUES (1, 0)"
);
ensureRow.run();

export function incrementHelloVisits(): number {
  db.prepare("UPDATE hello_visits SET count = count + 1 WHERE id = 1").run();
  const row = db
    .prepare("SELECT count FROM hello_visits WHERE id = 1")
    .get() as { count: number };
  return row.count;
}
