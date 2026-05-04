import { seedDummySuites } from "./db.js";

const inserted: number = seedDummySuites();
if (inserted === 0) {
  console.log(
    "Dummy suites already present (same UUIDs). No new rows inserted."
  );
} else {
  console.log(`Inserted ${inserted} dummy suite run(s).`);
}
