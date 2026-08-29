/* ============================================================
   The registry.

   The single place that knows what CommandHQ consists of. Adding an
   app is one entry here plus a /api/status endpoint on the app itself
   — the hub needs to know nothing else about it.

   `url: null` means "planned, not built". That is deliberately
   distinct from unreachable: nothing is wrong, it simply does not
   exist yet, and the panel says so rather than showing an error.
   ============================================================ */

export interface CaptureSpec {
  /** The word on the button. */
  verb: string;
  /** Shown under the verb when the app is not installed. */
  hint: string;
}

export interface AppEntry {
  id: string;
  name: string;
  role: string;
  /** Panel colour. Also the pad LED and the left edge of its controls. */
  colour: string;
  /** Darker shade for the pressed-button shadow. */
  shade: string;
  /** Base URL, or null when the app has not been built. */
  url: string | null;
  capture?: CaptureSpec;
  /** Path to a settings endpoint the deck may read and write, when the
   *  app chooses to expose one. Optional — most apps will not. */
  settingsPath?: string;
}

const env = (key: string): string | null => {
  const v = process.env[key];
  return v && v.trim() ? v.trim() : null;
};

export const APPS: AppEntry[] = [
  {
    id: "warden",
    name: "Warden",
    role: "Jobs · enforcement",
    colour: "#D8341F",
    shade: "#A93A1D",
    url: env("WARDEN_URL") ?? "http://localhost:3000",
    capture: { verb: "LOG", hint: "log an application" },
    settingsPath: "/api/settings",
  },
  {
    id: "nori",
    name: "Nori",
    role: "Money · receipts",
    colour: "#E88C3C",
    shade: "#B0662A",
    url: env("NORI_URL"),
    capture: { verb: "SNAP", hint: "photograph a receipt" },
  },
  {
    id: "vault",
    name: "Vault",
    role: "Files",
    colour: "#4A7FA5",
    shade: "#365E7B",
    url: env("VAULT_URL"),
    capture: { verb: "DROP", hint: "add a file" },
  },
  {
    id: "archive",
    name: "Archive",
    role: "Memories",
    colour: "#9B7FBF",
    shade: "#71599180",
    url: env("ARCHIVE_URL"),
  },
  {
    id: "registry",
    name: "Registry",
    role: "Project docs",
    colour: "#2F7D5F",
    shade: "#215A44",
    url: env("REGISTRY_URL"),
    capture: { verb: "NOTE", hint: "start a note" },
  },
  {
    id: "sentry",
    name: "Sentry",
    role: "Monitoring",
    colour: "#3FB3AF",
    shade: "#2E8783",
    url: env("SENTRY_URL"),
  },
];

export const byId = (id: string) => APPS.find((a) => a.id === id);
