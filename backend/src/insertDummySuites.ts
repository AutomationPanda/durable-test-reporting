import { seedDummySuites, seedDummyTestCases } from "./db.js";

const suitesInserted: number = seedDummySuites();
const testsInserted: number = seedDummyTestCases();

if (suitesInserted === 0) {
  console.log(
    "Dummy suites already present (same UUIDs). No new suite rows."
  );
} else {
  console.log(`Inserted ${suitesInserted} dummy suite run(s).`);
}

if (testsInserted === 0) {
  console.log(
    "Dummy test cases already present (same UUIDs). No new test rows."
  );
} else {
  console.log(`Inserted ${testsInserted} dummy test case(s).`);
}
