/* ============================================================
   The CommandHQ status contract.

   Every app implements GET /api/status and returns AppStatus. The hub
   never touches another app's database — it asks.

   This lives in the hub rather than in a package shared with the apps,
   deliberately. The apps are separate repos that deploy on their own
   schedule; a shared dependency for twenty lines of types would couple
   releases that have no reason to be coupled. Each side declares the
   shape it needs, and parseStatus() below is what makes the hub safe
   when an app disagrees.

   That is what keeps the apps genuinely independent: own container,
   own database, own deploy, own release cadence. Adding an app later
   is: build it, implement this endpoint, add one line to the hub's
   registry. Nothing in the hub needs to know how an app stores things.
   ============================================================ */

/** Traffic light for the pad LED. `attention` means a human needs to
 *  do something; `warn` means the app is unhappy but nobody is blocked. */
export type StatusLevel = "ok" | "warn" | "attention" | "down";

export interface StatusMetric {
  label: string;
  value: string;
}

/** Something that needs a person. These are merged across every app
 *  and shown on the readout — the only reason the hub is more useful
 *  than a bookmarks folder. */
export interface StatusAlert {
  /** Short and readable out of context: it appears beside alerts from
   *  other apps with only an app tag for context. */
  text: string;
  /** ISO 8601. Alerts across all apps are ordered by this. */
  due?: string;
  severity: "info" | "soon" | "urgent";
  /** Path within the app, e.g. "/pipeline". */
  href?: string;
}

export interface AppStatus {
  /** Registry key. Must match the hub's id for this app. */
  app: string;
  level: StatusLevel;
  /** One line, written for a human glancing at a panel. */
  headline: string;
  /** Rendered on the app's pad. Two is the practical maximum. */
  metrics: StatusMetric[];
  alerts: StatusAlert[];
  /** ISO 8601, stamped by the app when it answered. */
  at: string;
}

/* ---------------- capture ---------------- */

/** The verbs on the CAPTURE row. An app declares which one it offers
 *  and the hub renders a button for it; POST /api/capture performs it. */
export interface CaptureAction {
  verb: string;
  /** Free text describing what happened, shown on the readout. */
  result?: string;
}

export interface CaptureResult {
  ok: boolean;
  /** What to put on the readout, e.g. "9 of 100 · rate now 22.7/day". */
  message: string;
}

/* ---------------- helpers ---------------- */

/** What the hub records for an app it could not reach. Never thrown:
 *  one dead app must not take the panel down with it, because the
 *  panel is how you find out an app is dead. */
export function unreachable(app: string, reason: string): AppStatus {
  return { app, level: "down", headline: reason, metrics: [], alerts: [], at: new Date().toISOString() };
}

/** An app in the registry that has not been built yet. Distinct from
 *  `down`: nothing is wrong, it simply does not exist. */
export function notInstalled(app: string): AppStatus {
  return { app, level: "down", headline: "Not installed", metrics: [], alerts: [], at: new Date().toISOString() };
}

/** Narrow an unknown JSON body to AppStatus. An app returning nonsense
 *  should show as unreachable, not crash the hub or render garbage. */
export function parseStatus(app: string, body: unknown): AppStatus | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const levels: StatusLevel[] = ["ok", "warn", "attention", "down"];
  if (typeof b.headline !== "string") return null;
  if (!levels.includes(b.level as StatusLevel)) return null;

  const metrics = Array.isArray(b.metrics)
    ? b.metrics.filter(
        (m): m is StatusMetric =>
          !!m && typeof (m as StatusMetric).label === "string" && typeof (m as StatusMetric).value === "string",
      )
    : [];

  const alerts = Array.isArray(b.alerts)
    ? b.alerts.filter(
        (a): a is StatusAlert =>
          !!a && typeof (a as StatusAlert).text === "string" &&
          ["info", "soon", "urgent"].includes((a as StatusAlert).severity),
      )
    : [];

  return {
    app,
    level: b.level as StatusLevel,
    headline: b.headline,
    metrics,
    alerts,
    at: typeof b.at === "string" ? b.at : new Date().toISOString(),
  };
}
