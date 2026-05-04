import { useEffect, useState, type ReactElement } from "react";

type HelloResponse = {
  message: string;
  visits: number;
};

export default function App(): ReactElement {
  const [data, setData] = useState<HelloResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/hello")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json() as Promise<HelloResponse>;
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Request failed");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-semibold tracking-tight text-teal-400">
        Dashing
      </h1>
      <p className="max-w-md text-center text-slate-400">
        Blank hello-world shell: React + Tailwind on the client, Express + SQLite
        on the API. The visit counter is persisted so refreshes keep counting.
      </p>
      {error ? (
        <p className="rounded-md border border-amber-800/80 bg-amber-950/50 px-4 py-2 text-amber-200">
          API: {error} (is the backend running on port 3000?)
        </p>
      ) : data ? (
        <p className="rounded-md border border-slate-700 bg-slate-900/80 px-4 py-3 font-mono text-sm text-slate-200">
          {data.message}
          <span className="ml-2 text-slate-500">· visits: {data.visits}</span>
        </p>
      ) : (
        <p className="text-slate-500">Loading…</p>
      )}
    </main>
  );
}
