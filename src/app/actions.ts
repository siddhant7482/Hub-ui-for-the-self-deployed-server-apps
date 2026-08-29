"use server";

import { revalidatePath } from "next/cache";
import type { CaptureResult } from "@/lib/contract";
import { byId } from "@/lib/registry";

/* Capture goes through the owning app's own API, never its database.
 * The hub is a control surface; the apps remain the only things that
 * can write to themselves. */
export async function capture(appId: string): Promise<CaptureResult> {
  const app = byId(appId);
  if (!app) return { ok: false, message: `Unknown app: ${appId}` };
  if (!app.url) return { ok: false, message: `${app.name} is not installed` };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`${app.url}/api/capture`, {
      method: "POST",
      signal: controller.signal,
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const body = (await res.json().catch(() => null)) as CaptureResult | null;
    if (!res.ok || !body?.ok) {
      return { ok: false, message: body?.message ?? `${app.name} returned ${res.status}` };
    }
    revalidatePath("/");
    return body;
  } catch (e) {
    const aborted = (e as Error).name === "AbortError";
    return { ok: false, message: aborted ? `${app.name} timed out` : `${app.name} is unreachable` };
  } finally {
    clearTimeout(timer);
  }
}

/* The TARGET stepper. Goes through Warden's settings endpoint, like
 * everything else the deck touches — a control on this panel that wrote
 * to another app's database would undo the whole arrangement. */
export async function setTarget(monthlyTarget: number): Promise<CaptureResult> {
  const app = byId("warden");
  if (!app?.url || !app.settingsPath) return { ok: false, message: "Warden is not installed" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`${app.url}${app.settingsPath}`, {
      method: "POST",
      signal: controller.signal,
      cache: "no-store",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ monthlyTarget }),
    });
    const body = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!res.ok || !body?.ok) return { ok: false, message: body?.message ?? `Warden returned ${res.status}` };
    revalidatePath("/");
    return { ok: true, message: body.message ?? `${monthlyTarget} a month` };
  } catch (e) {
    const aborted = (e as Error).name === "AbortError";
    return { ok: false, message: aborted ? "Warden timed out" : "Warden is unreachable" };
  } finally {
    clearTimeout(timer);
  }
}
