import cors from "cors";
import express, { type Request, type Response } from "express";
import {
  getSuiteByUuid,
  listSuiteRuns,
  listTestCasesForSuite,
  recordSuiteEnd,
  recordSuiteStart,
  recordTestCaseEnd,
  recordTestCaseStart,
} from "./db.js";

const app = express();
const PORT: number = Number(process.env.PORT) || 3000;

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  })
);
app.use(express.json({ limit: "256kb" }));

type JsonBody = Record<string, unknown>;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function parseSuiteStart(body: JsonBody): { ok: true; value: { suiteUuid: string; suiteName: string; startTime: string } } | { ok: false; error: string } {
  const { suiteUuid, suiteName, startTime } = body;
  if (!isNonEmptyString(suiteUuid)) {
    return { ok: false, error: "suiteUuid is required" };
  }
  if (!isNonEmptyString(suiteName)) {
    return { ok: false, error: "suiteName is required" };
  }
  if (!isNonEmptyString(startTime)) {
    return { ok: false, error: "startTime is required" };
  }
  return { ok: true, value: { suiteUuid, suiteName, startTime } };
}

function parseSuiteEnd(body: JsonBody): { ok: true; value: { suiteUuid: string; endTime: string } } | { ok: false; error: string } {
  const { suiteUuid, endTime } = body;
  if (!isNonEmptyString(suiteUuid)) {
    return { ok: false, error: "suiteUuid is required" };
  }
  if (!isNonEmptyString(endTime)) {
    return { ok: false, error: "endTime is required" };
  }
  return { ok: true, value: { suiteUuid, endTime } };
}

function parseTestCaseStart(
  body: JsonBody
): { ok: true; value: { testUuid: string; suiteUuid: string; testName: string; startTime: string } } | { ok: false; error: string } {
  const { testUuid, suiteUuid, testName, startTime } = body;
  if (!isNonEmptyString(testUuid)) {
    return { ok: false, error: "testUuid is required" };
  }
  if (!isNonEmptyString(suiteUuid)) {
    return { ok: false, error: "suiteUuid is required" };
  }
  if (!isNonEmptyString(testName)) {
    return { ok: false, error: "testName is required" };
  }
  if (!isNonEmptyString(startTime)) {
    return { ok: false, error: "startTime is required" };
  }
  return { ok: true, value: { testUuid, suiteUuid, testName, startTime } };
}

function parseTestCaseEnd(
  body: JsonBody
): { ok: true; value: { testUuid: string; endTime: string; testResult: "pass" | "fail" } } | { ok: false; error: string } {
  const { testUuid, endTime, testResult } = body;
  if (!isNonEmptyString(testUuid)) {
    return { ok: false, error: "testUuid is required" };
  }
  if (!isNonEmptyString(endTime)) {
    return { ok: false, error: "endTime is required" };
  }
  if (testResult !== "pass" && testResult !== "fail") {
    return { ok: false, error: "testResult must be pass or fail" };
  }
  return { ok: true, value: { testUuid, endTime, testResult } };
}

app.get("/api/suites", (_req: Request, res: Response) => {
  res.json({ suites: listSuiteRuns() });
});

app.get("/api/suites/:suiteUuid/tests", (req: Request, res: Response) => {
  const suiteUuid = req.params.suiteUuid;
  if (!isNonEmptyString(suiteUuid)) {
    res.status(400).json({ error: "suiteUuid is required" });
    return;
  }
  const suite = getSuiteByUuid(suiteUuid);
  if (suite === null) {
    res.status(404).json({ error: "Suite not found" });
    return;
  }
  res.json({
    suite,
    tests: listTestCasesForSuite(suiteUuid),
  });
});

app.post("/api/events", (req: Request, res: Response) => {
  const body = req.body as unknown;
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    res.status(400).json({ error: "JSON object body required" });
    return;
  }
  const record = body as JsonBody;
  const type = record.type;
  if (!isNonEmptyString(type)) {
    res.status(400).json({ error: "type is required" });
    return;
  }

  if (type === "suite_start") {
    const parsed = parseSuiteStart(record);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    recordSuiteStart(parsed.value.suiteUuid, parsed.value.suiteName, parsed.value.startTime);
    res.status(204).send();
    return;
  }

  if (type === "suite_end") {
    const parsed = parseSuiteEnd(record);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    recordSuiteEnd(parsed.value.suiteUuid, parsed.value.endTime);
    res.status(204).send();
    return;
  }

  if (type === "test_case_start") {
    const parsed = parseTestCaseStart(record);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    recordTestCaseStart(
      parsed.value.testUuid,
      parsed.value.suiteUuid,
      parsed.value.testName,
      parsed.value.startTime
    );
    res.status(204).send();
    return;
  }

  if (type === "test_case_end") {
    const parsed = parseTestCaseEnd(record);
    if (!parsed.ok) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    recordTestCaseEnd(parsed.value.testUuid, parsed.value.endTime, parsed.value.testResult);
    res.status(204).send();
    return;
  }

  res.status(400).json({ error: `Unsupported event type: ${type}` });
});

app.listen(PORT, () => {
  console.log(`Dashing API listening on http://localhost:${PORT}`);
});
