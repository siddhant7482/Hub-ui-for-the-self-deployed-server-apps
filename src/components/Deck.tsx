"use client";

import { useState, useTransition } from "react";
import type { AppStatus, StatusAlert } from "@/lib/contract";
import type { AppEntry } from "@/lib/registry";
import { capture } from "@/app/actions";

type Alert = StatusAlert & { app: string; appName: string; colour: string };

export interface DeckProps {
  apps: AppEntry[];
  statuses: Record<string, AppStatus>;
  alerts: Alert[];
  installed: number;
  total: number;
  node: { memUsed: number; memTotal: number; load: number; cores: number; diskKnown: boolean };
  now: string;
}

/** The readout carries three things: the merged alert list at rest, an
 *  app's detail while you hover its pad, and the result of whatever you
 *  last pressed. One surface, so your eye never hunts for feedback. */
type Flash = { head: string; tag: string; text: string } | null;

export function Deck(props: DeckProps) {
  const { apps, statuses, alerts, installed, total, node, now } = props;
  const [flash, setFlash] = useState<Flash>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function say(head: string, tag: string, text: string, ms = 2600) {
    setFlash({ head, tag, text });
    setTimeout(() => setFlash(null), ms);
  }

  function press(app: AppEntry) {
    if (!app.capture || !app.url || busy) return;
    setBusy(app.id);
    say("WORKING", app.name.toUpperCase(), `${app.capture.verb.toLowerCase()}…`, 8000);
    startTransition(async () => {
      const r = await capture(app.id);
      setBusy(null);
      say(r.ok ? "DONE" : "FAILED", app.name.toUpperCase(), r.message, 3200);
    });
  }

  const hovered = hover ? apps.find((a) => a.id === hover) : null;

  return (
    <div className="deck">
      <span className="screw tl" /><span className="screw tr" />
      <span className="screw bl" /><span className="screw br" />

      <div className="plate">
        <div className="brand">
          <div className="brand-name">
            COMMANDHQ<small>NODE 105 · THINKCENTRE M900</small>
          </div>
          <div className="brand-meta">
            {now}<br />{installed} OF {total} ACTIVE
          </div>
        </div>

        {/* ---- readout ---- */}
        <div className="screen">
          {flash ? (
            <>
              <div className="screen-head">{flash.head}</div>
              <div className="screen-line"><span className="tag">{flash.tag}</span><span className="txt">{flash.text}</span></div>
            </>
          ) : hovered ? (
            <>
              <div className="screen-head">SELECTED</div>
              <div className="screen-line">
                <span className="tag">{hovered.name.toUpperCase()}</span>
                <span className="txt">{statuses[hovered.id]?.headline ?? "no status"}</span>
              </div>
            </>
          ) : (
            <>
              <div className="screen-head">NEEDS YOU · {alerts.length}</div>
              {alerts.length === 0 ? (
                <div className="screen-line quiet"><span className="tag">—</span><span className="txt">Nothing needs you.</span></div>
              ) : (
                alerts.slice(0, 3).map((a, i) => {
                  const app = apps.find((x) => x.id === a.app);
                  const body = (
                    <>
                      <span className="tag">{a.appName.toUpperCase()}</span>
                      <span className="txt">{a.text}</span>
                      {a.due ? <span className="when">{due(a.due)}</span> : null}
                    </>
                  );
                  return app?.url && a.href ? (
                    <a className="screen-line" key={i} href={`${app.url}${a.href}`}>{body}</a>
                  ) : (
                    <div className="screen-line" key={i}>{body}</div>
                  );
                })
              )}
            </>
          )}
        </div>

        {/* ---- pads ---- */}
        <div className="legend">APPLICATIONS</div>
        <div className="pads">
          {apps.map((app) => {
            const s = statuses[app.id];
            const live = Boolean(app.url) && s?.level !== "down";
            const alarm = s?.level === "attention";
            const inner = (
              <>
                <span className="led" />
                <span className="pad-name">{app.name}</span>
                <span className="pad-stat">
                  {live && s?.metrics.length
                    ? s.metrics.map((m, i) => <span key={i}>{m.value}<br /></span>)
                    : app.url ? (s?.headline ?? "unreachable") : "NOT INSTALLED"}
                </span>
              </>
            );
            const cls = `pad ${live ? "on" : "off"} ${alarm ? "alarm" : ""} ${app.url && !live ? "down" : ""}`;
            return app.url && live ? (
              <a key={app.id} className={cls} href={app.url}
                 style={{ ["--c" as string]: app.colour }}
                 onMouseEnter={() => setHover(app.id)} onMouseLeave={() => setHover(null)}
                 onFocus={() => setHover(app.id)} onBlur={() => setHover(null)}>
                {inner}
              </a>
            ) : (
              <div key={app.id} className={cls} style={{ ["--c" as string]: app.colour }}>{inner}</div>
            );
          })}
        </div>

        {/* ---- capture ---- */}
        <div className="legend" style={{ marginTop: "1.1rem" }}>CAPTURE</div>
        <div className="capture">
          {apps.filter((a) => a.capture).map((app) => {
            const live = Boolean(app.url) && statuses[app.id]?.level !== "down";
            return (
              <button key={app.id}
                className={`cap ${busy === app.id ? "busy" : ""}`}
                disabled={!live || busy !== null}
                style={{ ["--c" as string]: app.colour, ["--cdark" as string]: app.shade }}
                onClick={() => press(app)}>
                <div className="cap-verb">{app.capture!.verb}</div>
                <div className="cap-app">{app.name.toUpperCase()}</div>
                <div className="cap-sub">{live ? app.capture!.hint : "not installed"}</div>
              </button>
            );
          })}
        </div>

        {/* ---- node ---- */}
        <div className="legend" style={{ marginTop: "1.1rem" }}>NODE</div>
        <div className="node-row">
          <Meter label="MEMORY"
                 value={`${node.memUsed.toFixed(1)} / ${node.memTotal.toFixed(0)} GB`}
                 pct={(node.memUsed / node.memTotal) * 100} />
          {/* Disk needs a platform call the hub's container cannot make
              for the whole node. Sentry owns that number when it exists. */}
          <Meter label="DISK" value={node.diskKnown ? "—" : "awaiting Sentry"} pct={0} pending />
          <Meter label="LOAD"
                 value={node.load > 0 ? `${node.load.toFixed(2)} / ${node.cores}` : `— / ${node.cores}`}
                 pct={node.load > 0 ? (node.load / node.cores) * 100 : 0}
                 pending={node.load === 0} />
          <div className="sentry-lamp">
            <span className="led" style={sentryLamp(apps, statuses)} />
            <span>{sentryText(apps, statuses)}</span>
          </div>
        </div>

        <div className="serial">CHQ-105 · {total} BAY · REV A</div>
      </div>
    </div>
  );
}

function Meter({ label, value, pct, pending }: { label: string; value: string; pct: number; pending?: boolean }) {
  return (
    <div>
      <div className="m-top"><span>{label}</span><span>{value}</span></div>
      <div className={`m-track ${pending ? "pending" : ""}`}>
        <i style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
    </div>
  );
}

function sentryLamp(apps: AppEntry[], statuses: Record<string, AppStatus>): React.CSSProperties {
  const s = statuses["sentry"];
  const on = s && s.level !== "down";
  const colour = apps.find((a) => a.id === "sentry")?.colour ?? "#3FB3AF";
  return on
    ? { background: colour, boxShadow: `0 0 10px 1px ${colour}` }
    : { background: "rgba(0,0,0,.22)", boxShadow: "inset 0 1px 2px rgba(0,0,0,.55)" };
}

function sentryText(apps: AppEntry[], statuses: Record<string, AppStatus>): string {
  const s = statuses["sentry"];
  if (!s || s.level === "down") return "SENTRY OFFLINE";
  return s.headline.toUpperCase();
}

/** Short relative time for the readout — "2d", "TOMORROW", "14:30". */
function due(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const days = Math.ceil((t - Date.now()) / 864e5);
  if (days < 0) return "OVERDUE";
  if (days === 0) return "TODAY";
  if (days === 1) return "TOMORROW";
  if (days <= 14) return `${days}D`;
  return new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase();
}
