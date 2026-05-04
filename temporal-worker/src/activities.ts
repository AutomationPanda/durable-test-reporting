import type { DashingEvent } from "./dashingEvent.js";

const baseUrl: string = (
  process.env.DASHING_API_URL ?? "http://127.0.0.1:3000"
).replace(/\/$/, "");

/**
 * Non-deterministic side effect: **not** safe to call from workflow code directly.
 *
 * **Idempotency:** Temporal may invoke this activity **more than once** for the same
 * logical event (retries after failure, timeout ambiguity, worker crash). Dashing
 * should treat `POST /api/events` as **at-least-once** (see `temporal-publisher.md`
 * and backend `ON CONFLICT` / `UPDATE` behavior for current partial tolerance).
 */
export async function publishDashingEvent(event: DashingEvent): Promise<void> {
  const url = `${baseUrl}/api/events`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Dashing POST ${res.status}: ${text.slice(0, 500)}`);
  }
}
