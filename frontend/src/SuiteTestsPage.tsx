import { useEffect, useState, type ReactElement } from "react";
import { Link, useParams } from "react-router-dom";

type SuiteRun = {
  suiteUuid: string;
  suiteName: string;
  startTime: string;
  endTime: string | null;
  passRatePercent: number | null;
};

type TestCaseRun = {
  testUuid: string;
  suiteUuid: string;
  testName: string;
  startTime: string;
  endTime: string | null;
  testResult: "pass" | "fail" | null;
};

type SuiteTestsResponse = {
  suite: SuiteRun;
  tests: TestCaseRun[];
};

function formatInstant(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

function isFinished(row: TestCaseRun): boolean {
  return row.endTime !== null && row.testResult !== null;
}

export default function SuiteTestsPage(): ReactElement {
  const { suiteUuid } = useParams<{ suiteUuid: string }>();
  const [data, setData] = useState<SuiteTestsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!suiteUuid) {
      setError("Missing suite id");
      return;
    }

    let cancelled = false;
    const path = `/api/suites/${encodeURIComponent(suiteUuid)}/tests`;

    async function load(): Promise<void> {
      try {
        const res = await fetch(path);
        if (res.status === 404) {
          if (!cancelled) {
            setError("Suite not found");
            setData(null);
          }
          return;
        }
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as SuiteTestsResponse;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Request failed");
          setData(null);
        }
      }
    }

    void load();
    const id = window.setInterval(() => {
      void load();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [suiteUuid]);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-10">
      <nav>
        <Link
          to="/"
          className="text-sm font-medium underline-offset-4 hover:underline"
          style={{ color: "var(--color-accent)" }}
        >
          ← All suite runs
        </Link>
      </nav>

      {error && !data ? (
        <p
          className="rounded-md border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--color-error-border)",
            backgroundColor: "var(--color-error-bg)",
            color: "var(--color-error-text)",
          }}
        >
          {error}
        </p>
      ) : null}

      {data ? (
        <>
          <header className="flex flex-col gap-2">
            <h1
              className="text-2xl font-semibold tracking-tight"
              style={{ color: "var(--color-text-primary)" }}
            >
              {data.suite.suiteName}
            </h1>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Suite started {formatInstant(data.suite.startTime)}
              {data.suite.endTime
                ? ` · ended ${formatInstant(data.suite.endTime)}`
                : " · still running"}
            </p>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              Passing rate (completed tests):{" "}
              {data.suite.passRatePercent === null ? (
                <span style={{ color: "var(--color-text-subtle)" }}>—</span>
              ) : (
                <span
                  className="font-semibold tabular-nums"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {data.suite.passRatePercent}%
                </span>
              )}
            </p>
          </header>

          {data.tests.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)" }}>
              No test cases recorded for this suite yet.
            </p>
          ) : (
            <div
              className="overflow-hidden rounded-lg border"
              style={{
                borderColor: "var(--color-border)",
                backgroundColor: "var(--color-surface)",
              }}
            >
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr
                    className="border-b"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    <th
                      className="px-4 py-3 font-medium"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Test
                    </th>
                    <th
                      className="px-4 py-3 font-medium"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Start
                    </th>
                    <th
                      className="px-4 py-3 font-medium"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Status
                    </th>
                    <th
                      className="px-4 py-3 font-medium"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      End
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.tests.map((row, index) => {
                    const done = isFinished(row);
                    const stripe =
                      index % 2 === 1
                        ? "var(--color-surface-elevated)"
                        : "transparent";
                    return (
                      <tr key={row.testUuid} style={{ backgroundColor: stripe }}>
                        <td className="px-4 py-3 font-medium">{row.testName}</td>
                        <td
                          className="px-4 py-3 font-mono text-xs"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {formatInstant(row.startTime)}
                        </td>
                        <td className="px-4 py-3">
                          {!done ? (
                            <span
                              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                              style={{
                                backgroundColor:
                                  "var(--color-status-progress-bg)",
                                color: "var(--color-status-progress)",
                              }}
                            >
                              In Progress
                            </span>
                          ) : row.testResult === "pass" ? (
                            <span
                              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                              style={{
                                backgroundColor: "var(--color-status-pass-bg)",
                                color: "var(--color-status-pass)",
                              }}
                            >
                              Pass
                            </span>
                          ) : (
                            <span
                              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                              style={{
                                backgroundColor: "var(--color-status-fail-bg)",
                                color: "var(--color-status-fail)",
                              }}
                            >
                              Fail
                            </span>
                          )}
                        </td>
                        <td
                          className="px-4 py-3 font-mono text-xs"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {done && row.endTime
                            ? formatInstant(row.endTime)
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : !error ? (
        <p style={{ color: "var(--color-text-subtle)" }}>Loading tests…</p>
      ) : null}
    </main>
  );
}
