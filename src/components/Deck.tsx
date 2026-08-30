"use client";

import { useState, useTransition } from "react";
import type { AppStatus, StatusAlert } from "@/lib/contract";
import type { AppEntry } from "@/lib/registry";
import { capture, setTarget } from "@/app/actions";

/* ============================================================
   The deck.

   Status and capture are generic — any app implementing the contract
   gets a pad and a button with no code here. The widgets below are
   deliberately NOT generic: a year scrubber only means something for a
   photo archive, and inventing a plugin system so six known apps can
   declare sliders would be a worse trade than knowing about them.

   Every widget is gated on whether its app is actually live. Dead ones
   render colourless and disabled rather than hidden, so the panel shows
   the whole machine and is honest about which parts of it exist.
   ============================================================ */

type Alert = StatusAlert & { app: string; appName: string; colour: string };

export interface DeckProps {
  apps: AppEntry[];
  statuses: Record<string, AppStatus>;
  alerts: Alert[];
  installed: number;
  total: number;
  node: { memUsed: number; memTotal: number; load: number; cores: number };
  now: string;
  /** From Warden's own settings endpoint; null when it is unreachable. */
  monthlyTarget: number | null;
}

type Flash = { head: string; tag: string; text: string } | null;

const CATEGORIES = ["GROCERIES", "EATING OUT", "TRANSPORT", "BILLS", "OTHER"];
const YEARS = [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

export function Deck(props: DeckProps) {
  const { apps, statuses, alerts, installed, total, node, now } = props;

  const [flash, setFlash] = useState<Flash>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [target, setTargetState] = useState<number | null>(props.monthlyTarget);
  const [category, setCategory] = useState(0);
  const [year, setYear] = useState(2019);
  const [, startTransition] = useTransition();

  const live = (id: string) => {
    const app = apps.find((a) => a.id === id);
    return Boolean(app?.url) && statuses[id]?.level !== "down";
  };

  function say(head: string, tag: string, text: string, ms = 2600) {
    setFlash({ head, tag, text });
    setTimeout(() => setFlash(null), ms);
  }

  function press(app: AppEntry) {
    if (!app.capture || !live(app.id) || busy) return;
    setBusy(app.id);
    say("WORKING", app.name.toUpperCase(), `${app.capture.verb.toLowerCase()}…`, 9000);
    startTransition(async () => {
      const r = await capture(app.id);
      setBusy(null);
      say(r.ok ? "DONE" : "FAILED", app.name.toUpperCase(), r.message, 3200);
    });
  }

  function nudgeTarget(delta: number) {
    if (target === null || busy) return;
    const next = Math.max(10, Math.min(1000, target + delta));
    setTargetState(next);
    setBusy("target");
    startTransition(async () => {
      const r = await setTarget(next);
      setBusy(null);
      if (!r.ok) setTargetState(props.monthlyTarget);
      say(r.ok ? "TARGET" : "FAILED", "WARDEN", r.message, 2200);
    });
  }

  const hovered = hover ? apps.find((a) => a.id === hover) : null;
  const wardenLive = live("warden");
  const noriLive = live("nori");
  const archiveLive = live("archive");
  const sentryLive = live("sentry");
  const sentry = apps.find((a) => a.id === "sentry");

  return (
    <div className="deck">
      <span className="screw tl" /><span className="screw tr" />
      <span className="screw bl" /><span className="screw br" />

      <div className="plate">
        <div className="brand">
          <div className="brand-name">COMMANDHQ<small>NODE 105 · THINKCENTRE M900</small></div>
          <div className="brand-meta">{now}<br />{installed} OF {total} ACTIVE</div>
        </div>

        {/* ---- readout: every app's alerts, merged ---- */}
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
                  const inner = (
                    <>
                      <span className="tag">{a.appName.toUpperCase()}</span>
                      <span className="txt">{a.text}</span>
                      {a.due ? <span className="when">{due(a.due)}</span> : null}
                    </>
                  );
                  return app?.url && a.href
                    ? <a className="screen-line" key={i} href={`${app.url}${a.href}`}>{inner}</a>
                    : <div className="screen-line" key={i}>{inner}</div>;
                })
              )}
            </>
          )}
        </div>

        {/* ---- pads ---- */}
        <div className="legend first">APPLICATIONS</div>
        <div className="pads">
          {apps.map((app) => {
            const s = statuses[app.id];
            const on = live(app.id);
            const inner = (
              <>
                <span className="led" />
                <div>
                  <div className="pad-name">{app.name}</div>
                  <div className="pad-role">{app.role}</div>
                </div>
                <span className="pad-stat">
                  {on && s?.metrics.length
                    ? s.metrics.map((m) => m.value).join("  ·  ")
                    : app.url ? (s?.headline ?? "unreachable") : "NOT INSTALLED"}
                </span>
              </>
            );
            const cls = `pad ${on ? "on" : "off"} ${s?.level === "attention" ? "alarm" : ""} ${app.url && !on ? "down" : ""}`;
            const style = { ["--c" as string]: app.colour };
            return on && app.url ? (
              <a key={app.id} className={cls} href={app.url} style={style}
                 onMouseEnter={() => setHover(app.id)} onMouseLeave={() => setHover(null)}
                 onFocus={() => setHover(app.id)} onBlur={() => setHover(null)}>{inner}</a>
            ) : (
              <div key={app.id} className={cls} style={style}>{inner}</div>
            );
          })}
        </div>

        {/* ---- capture ---- */}
        <div className="legend">CAPTURE</div>
        <div className="capture">
          {apps.filter((a) => a.capture).map((app) => {
            const on = live(app.id);
            return (
              <button key={app.id} className={`cap ${busy === app.id ? "busy" : ""}`}
                disabled={!on || busy !== null}
                style={{ ["--c" as string]: app.colour, ["--cdark" as string]: app.shade }}
                onClick={() => press(app)}>
                <div className="cap-verb">{app.capture!.verb}</div>
                <div className="cap-app">{app.name.toUpperCase()}</div>
                <div className="cap-sub">{on ? app.capture!.hint : "not installed"}</div>
              </button>
            );
          })}
        </div>

        {/* Nori's output, directly beneath its button: what the next
            capture files as, and what the last few came back with. */}
        <div className={`strip ${noriLive ? "" : "dead"}`} style={{ ["--c" as string]: colour(apps, "nori") }}>
          <div className="cat">
            <button className="mini" disabled={!noriLive} aria-label="Previous category"
              onClick={() => setCategory((c) => (c - 1 + CATEGORIES.length) % CATEGORIES.length)}>◀</button>
            <div className="cat-val">{CATEGORIES[category]}</div>
            <button className="mini" disabled={!noriLive} aria-label="Next category"
              onClick={() => setCategory((c) => (c + 1) % CATEGORIES.length)}>▶</button>
          </div>
          <div className="chips">
            <span className="chip empty">{noriLive ? "nothing captured yet" : "Nori is not installed"}</span>
          </div>
          <div className="strip-txt strip-end"><b>—</b><br />unfiled</div>
        </div>

        {/* ---- tune ---- */}
        <div className="legend">TUNE</div>
        <div className="tune">
          <div className={`ctl ${wardenLive && target !== null ? "" : "dead"}`} style={{ ["--c" as string]: colour(apps, "warden") }}>
            <div className="ctl-cap"><span>TARGET</span><span>WARDEN</span></div>
            <div className="stepper">
              <button className="step" disabled={!wardenLive || target === null || busy !== null}
                onClick={() => nudgeTarget(-10)} aria-label="Lower target">–</button>
              <div className="step-val">{target ?? "—"}<small>A MONTH</small></div>
              <button className="step" disabled={!wardenLive || target === null || busy !== null}
                onClick={() => nudgeTarget(10)} aria-label="Raise target">+</button>
            </div>
          </div>

          {/* Archive's year scrubber. The histogram is its own data, so
              until Archive exists there is nothing to draw on the track. */}
          <div className={`ctl tune-wide ${archiveLive ? "" : "dead"}`} style={{ ["--c" as string]: colour(apps, "archive") }}>
            <div className="ctl-cap"><span>YEAR</span><span>ARCHIVE</span></div>
            <div className="histo">
              {YEARS.map((y) => <i key={y} className={y === year ? "sel" : ""} style={{ height: archiveLive ? "60%" : "22%" }} />)}
            </div>
            <div className="fader-row">
              <input type="range" min={2014} max={2026} value={year} disabled={!archiveLive}
                aria-label="Archive year" onChange={(e) => setYear(Number(e.target.value))} />
              <div className="fader-val">{archiveLive ? year : "—"}</div>
            </div>
          </div>

          <div className={`ctl ${noriLive ? "" : "dead"}`} style={{ ["--c" as string]: colour(apps, "nori") }}>
            <div className="ctl-cap"><span>BUDGET</span><span>NORI</span></div>
            <div className="stepper">
              <button className="step" disabled={!noriLive} aria-label="Lower budget">–</button>
              <div className="step-val">{noriLive ? "£1200" : "—"}<small>A MONTH</small></div>
              <button className="step" disabled={!noriLive} aria-label="Raise budget">+</button>
            </div>
          </div>
        </div>

        {/* The one thing on the panel that gives you something rather
            than asking for something. */}
        <div className={`strip ${archiveLive ? "" : "dead"}`} style={{ ["--c" as string]: colour(apps, "archive") }}>
          <div className="thumbs">
            <i style={{ background: "linear-gradient(135deg,#5a4a6a,#8a6f9f)" }} />
            <i style={{ background: "linear-gradient(200deg,#7a5a4a,#c19a7a)" }} />
            <i style={{ background: "linear-gradient(45deg,#3a5a5a,#6f9f9a)" }} />
          </div>
          <div className="strip-txt">
            <b>On this day</b><br />
            {archiveLive ? `${year} · nothing indexed yet` : "Archive is not installed"}
          </div>
          <button className="mini strip-end" disabled={!archiveLive}>OPEN</button>
        </div>

        {/* ---- node ---- */}
        <div className="legend">NODE</div>
        <div className="node-row">
          <Meter label="MEMORY"
                 value={`${node.memUsed.toFixed(1)} / ${node.memTotal.toFixed(0)} GB`}
                 pct={(node.memUsed / node.memTotal) * 100} />
          <Meter label="DISK" value="awaiting Sentry" pct={0} pending />
          <Meter label="LOAD"
                 value={node.load > 0 ? `${node.load.toFixed(2)} / ${node.cores}` : `— / ${node.cores}`}
                 pct={node.load > 0 ? (node.load / node.cores) * 100 : 0}
                 pending={node.load === 0} />
          <div className="sentry-lamp">
            <span className="led" style={sentryLive
              ? { background: sentry?.colour, boxShadow: `0 0 10px 1px ${sentry?.colour}` }
              : { background: "rgba(0,0,0,.22)", boxShadow: "inset 0 1px 2px rgba(0,0,0,.55)" }} />
            <span>{sentryLive ? (statuses["sentry"]?.headline ?? "").toUpperCase() : "SENTRY OFFLINE"}</span>
          </div>
        </div>

        <div className="serial">CHQ-105 · {total} BAY · REV A</div>
      </div>
    </div>
  );
}

function colour(apps: AppEntry[], id: string): string {
  return apps.find((a) => a.id === id)?.colour ?? "var(--pad-lo)";
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

/** Short relative time for the readout. */
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
