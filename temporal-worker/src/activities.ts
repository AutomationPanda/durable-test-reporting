import type { DashingEvent } from "./dashingEvent.js";

const baseUrl: string = (
  process.env.DASHING_API_URL ?? "http://127.0.0.1:3000"
).replace(/\/$/, "");

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
