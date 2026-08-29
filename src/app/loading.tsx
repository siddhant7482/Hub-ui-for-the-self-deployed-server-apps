import { APPS } from "@/lib/registry";

/* ============================================================
   The loader is the deck, unpowered.

   A spinner would be the wrong object entirely: this page is an
   instrument, and instruments do not spin, they warm up. Rendering the
   real chassis with everything dark means there is no layout shift when
   the data lands — the panel is already there, it just lights.

   It also tells the truth about what the wait is for. The hub is asking
   six applications how they are, in parallel, behind a 1.5s timeout, so
   the readout says exactly that.
   ============================================================ */

export default function Loading() {
  return (
    <div className="deck booting" aria-busy="true" aria-label="Powering up">
      <span className="screw tl" /><span className="screw tr" />
      <span className="screw bl" /><span className="screw br" />

      <div className="plate">
        <div className="brand">
          <div className="brand-name">COMMANDHQ<small>NODE 105 · THINKCENTRE M900</small></div>
          <div className="brand-meta">POWERING UP<br />— OF {APPS.length} ACTIVE</div>
        </div>

        <div className="screen">
          <div className="screen-head">INITIALISING</div>
          <div className="screen-line">
            <span className="tag">NODE 105</span>
            <span className="txt">
              polling {APPS.length} applications<span className="caret" />
            </span>
          </div>
        </div>

        <div className="legend first">APPLICATIONS</div>
        <div className="pads">
          {APPS.map((app, i) => (
            <div key={app.id} className="pad off" style={{ ["--i" as string]: i }}>
              {/* Each LED comes up a beat after the last, so the panel
                  reads as booting rather than merely broken. */}
              <span className="led scan" />
              <div>
                <div className="pad-name">{app.name}</div>
                <div className="pad-role">{app.role}</div>
              </div>
              <span className="pad-stat">—</span>
            </div>
          ))}
        </div>

        <div className="legend">CAPTURE</div>
        <div className="capture">
          {APPS.filter((a) => a.capture).map((app) => (
            <button key={app.id} className="cap" disabled>
              <div className="cap-verb">{app.capture!.verb}</div>
              <div className="cap-app">{app.name.toUpperCase()}</div>
              <div className="cap-sub">—</div>
            </button>
          ))}
        </div>

        {/* Both strips, at their real heights. A loader that is a
            different shape from the page it precedes causes exactly the
            layout shift it exists to prevent. */}
        <div className="strip dead">
          <div className="cat">
            <button className="mini" disabled>◀</button>
            <div className="cat-val">—</div>
            <button className="mini" disabled>▶</button>
          </div>
          <div className="chips"><span className="chip empty">—</span></div>
          <div className="strip-txt strip-end"><b>—</b><br />unfiled</div>
        </div>

        <div className="legend">TUNE</div>
        <div className="tune">
          <div className="ctl dead">
            <div className="ctl-cap"><span>TARGET</span><span>WARDEN</span></div>
            <div className="stepper">
              <button className="step" disabled>–</button>
              <div className="step-val">—<small>A MONTH</small></div>
              <button className="step" disabled>+</button>
            </div>
          </div>
          <div className="ctl tune-wide dead">
            <div className="ctl-cap"><span>YEAR</span><span>ARCHIVE</span></div>
            <div className="histo">
              {Array.from({ length: 13 }, (_, i) => <i key={i} style={{ height: "22%" }} />)}
            </div>
            <div className="fader-row">
              <input type="range" min={0} max={100} defaultValue={50} disabled aria-hidden="true" tabIndex={-1} />
              <div className="fader-val">—</div>
            </div>
          </div>
          <div className="ctl dead">
            <div className="ctl-cap"><span>BUDGET</span><span>NORI</span></div>
            <div className="stepper">
              <button className="step" disabled>–</button>
              <div className="step-val">—<small>A MONTH</small></div>
              <button className="step" disabled>+</button>
            </div>
          </div>
        </div>

        <div className="strip dead">
          <div className="thumbs"><i /><i /><i /></div>
          <div className="strip-txt"><b>On this day</b><br />—</div>
          <button className="mini strip-end" disabled>OPEN</button>
        </div>

        <div className="legend">NODE</div>
        <div className="node-row">
          {["MEMORY", "DISK", "LOAD"].map((label) => (
            <div key={label}>
              <div className="m-top"><span>{label}</span><span>—</span></div>
              <div className="m-track pending"><i style={{ width: "0%" }} /></div>
            </div>
          ))}
          <div className="sentry-lamp">
            <span className="led" />
            <span>—</span>
          </div>
        </div>

        <div className="serial">CHQ-105 · {APPS.length} BAY · REV A</div>
      </div>
    </div>
  );
}
