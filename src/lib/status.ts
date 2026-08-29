import { notInstalled, parseStatus, unreachable, type AppStatus, type StatusAlert } from "@/lib/contract";
import { APPS, type AppEntry } from "./registry";

/* ============================================================
   Asking every app how it is.

   Two rules, both about the same thing: the panel is how you find out
   an app is broken, so a broken app must never break the panel.

     1. Nothing here throws. A dead app becomes a `down` status.
     2. Everything is fetched in parallel behind a short timeout, so
        one hanging app costs the page 1.5 seconds, not 30.
   ============================================================ */

const TIMEOUT_MS = 1500;

async function askOne(app: AppEntry): Promise<AppStatus> {
  if (!app.url) return notInstalled(app.id);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${app.url}/api/status`, {
      signal: controller.signal,
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!res.ok) return unreachable(app.id, `HTTP ${res.status}`);

    // An app returning nonsense should read as unreachable, not render
    // garbage onto the panel.
    const parsed = parseStatus(app.id, await res.json().catch(() => null));
    return parsed ?? unreachable(app.id, "Bad status payload");
  } catch (e) {
    const aborted = (e as Error).name === "AbortError";
    return unreachable(app.id, aborted ? "Timed out" : "Unreachable");
  } finally {
    clearTimeout(timer);
  }
}

export interface HubModel {
  statuses: Record<string, AppStatus>;
  /** Every alert from every app, merged and ordered by when. This is
   *  the readout, and the reason the hub beats a bookmarks folder. */
  alerts: Array<StatusAlert & { app: string; appName: string; colour: string }>;
  installed: number;
  total: number;
}

export async function getHub(): Promise<HubModel> {
  const results = await Promise.all(APPS.map(askOne));
  const statuses: Record<string, AppStatus> = {};
  results.forEach((s, i) => (statuses[APPS[i].id] = s));

  const alerts = APPS.flatMap((app) =>
    (statuses[app.id]?.alerts ?? []).map((a) => ({
      ...a,
      app: app.id,
      appName: app.name,
      colour: app.colour,
    })),
  ).sort((a, b) => {
    // Urgency first, then soonest. An undated alert sorts last within
    // its severity rather than pretending to be imminent.
    const rank = { urgent: 0, soon: 1, info: 2 } as const;
    if (rank[a.severity] !== rank[b.severity]) return rank[a.severity] - rank[b.severity];
    if (a.due && b.due) return Date.parse(a.due) - Date.parse(b.due);
    return a.due ? -1 : b.due ? 1 : 0;
  });

  return {
    statuses,
    alerts,
    installed: APPS.filter((a) => a.url && statuses[a.id]?.level !== "down").length,
    total: APPS.length,
  };
}
