import os from "node:os";
import { Deck } from "@/components/Deck";
import { APPS } from "@/lib/registry";
import { getHub } from "@/lib/status";

/* Asks every app how it is, on every load. The panel is only useful if
 * it is current, so nothing here is cached. */
export const dynamic = "force-dynamic";

export default async function Home() {
  const hub = await getHub();

  /* Real numbers from the host this container is on. Memory is
   * genuinely the hub's own cgroup; load is zero on Windows, which the
   * meter renders as pending rather than as a confident 0.00. */
  const memTotal = os.totalmem() / 1e9;
  const memUsed = (os.totalmem() - os.freemem()) / 1e9;
  const load = os.loadavg()[0];
  const cores = os.cpus().length;

  const now = new Date()
    .toLocaleString("en-GB", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    .toUpperCase()
    .replace(",", " ·");

  return (
    <Deck
      apps={APPS}
      statuses={hub.statuses}
      alerts={hub.alerts}
      installed={hub.installed}
      total={hub.total}
      node={{ memUsed, memTotal, load, cores, diskKnown: false }}
      now={now}
    />
  );
}
