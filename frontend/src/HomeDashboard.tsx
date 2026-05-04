import { useEffect, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";

type SuiteRun = {
  suiteUuid: string;
  suiteName: string;
  startTime: string;
  endTime: string | null;
  passRatePercent: number | null;
};

type SuitesResponse = {
  suites: SuiteRun[];
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

export default function HomeDashboard(): ReactElement {
  const navigate = useNavigate();
  const [suites, setSuites] = useState<SuiteRun[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const res = await fetch("/api/suites");
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as SuitesResponse;
        if (!cancelled) {
          setSuites(json.suites);
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Request failed");
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
  }, []);

  function goToSuite(suiteUuid: string): void {
    navigate(`/suites/${encodeURIComponent(suiteUuid)}/tests`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1
          className="text-3xl font-semibold tracking-tight"
          style={{ color: "var(--color-accent)" }}
        >
          Dashing
        </h1>
        <p style={{ color: "var(--color-text-muted)" }}>
          Test suite runs (newest first). Pass rate is the share of{" "}
          <strong
            className="font-medium"
            style={{ color: "var(--color-text-primary)" }}
          >
            passed
          </strong>{" "}
          among{" "}
          <strong
            className="font-medium"
            style={{ color: "var(--color-text-primary)" }}
          >
            completed
          </strong>{" "}
          tests only. Click a row for cases. Refreshes every few seconds.
        </p>
      </header>

      {error ? (
        <p
          className="rounded-md border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--color-error-border)",
            backgroundColor: "var(--color-error-bg)",
            color: "var(--color-error-text)",
          }}
        >
          Could not load suites: {error}. Is the API running on port 3000?
        </p>
      ) : suites === null ? (
        <p style={{ color: "var(--color-text-subtle)" }}>Loading suites…</p>
      ) : suites.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)" }}>
          No suite runs yet. Publish{" "}
          <code className="rounded bg-[var(--color-surface-elevated)] px-1.5 py-0.5 text-xs">
            suite_start
          </code>{" "}
          and{" "}
          <code className="rounded bg-[var(--color-surface-elevated)] px-1.5 py-0.5 text-xs">
            suite_end
          </code>{" "}
          events to <code className="text-xs">POST /api/events</code>.
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
                  Suite
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
                  Pass rate
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
              {suites.map((row, index) => {
                const complete = row.endTime !== null;
                const stripe =
                  index % 2 === 1
                    ? "var(--color-surface-elevated)"
                    : "transparent";
                return (
                  <tr
                    key={row.suiteUuid}
                    tabIndex={0}
                    className="cursor-pointer outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{
                      backgroundColor: stripe,
                      outlineColor: "var(--color-focus-ring)",
                    }}
                    onClick={() => {
                      goToSuite(row.suiteUuid);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        goToSuite(row.suiteUuid);
                      }
                    }}
                  >
                    <td className="px-4 py-3 font-medium">{row.suiteName}</td>
                    <td
                      className="px-4 py-3 font-mono text-xs"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {formatInstant(row.startTime)}
                    </td>
                    <td
                      className="px-4 py-3 tabular-nums"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {row.passRatePercent === null ? (
                        <span style={{ color: "var(--color-text-subtle)" }}>
                          —
                        </span>
                      ) : (
                        <span
                          className="font-medium"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {row.passRatePercent}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {complete ? (
                        <span
                          className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: "var(--color-status-complete-bg)",
                            color: "var(--color-status-complete)",
                          }}
                        >
                          Complete
                        </span>
                      ) : (
                        <span
                          className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: "var(--color-status-progress-bg)",
                            color: "var(--color-status-progress)",
                          }}
                        >
                          In Progress
                        </span>
                      )}
                    </td>
                    <td
                      className="px-4 py-3 font-mono text-xs"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {complete && row.endTime
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
    </main>
  );
}
