import cors from "cors";
import express, { type Request, type Response } from "express";
import { listSuiteRuns, recordSuiteEnd, recordSuiteStart } from "./db.js";

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

app.get("/api/suites", (_req: Request, res: Response) => {
  res.json({ suites: listSuiteRuns() });
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

  res.status(400).json({ error: `Unsupported event type: ${type}` });
});

app.listen(PORT, () => {
  console.log(`Dashing API listening on http://localhost:${PORT}`);
});
