# CommandHQ — Hub

The front door for a self-hosted app node. Not a launcher: **a control
deck.**

One screen that tells you what needs a human across every app you run,
and lets you act on it without opening any of them.

Running on a Lenovo ThinkCentre M900 Tiny alongside
[Warden](https://github.com/siddhant7482/Warden-doomsday-program-for-jop-applications-),
the first app on the node.

---

## Why a deck and not a dashboard

A homelab dashboard is usually a grid of tiles linking to services. That
is a bookmarks folder with extra steps — you still have to open each app
to find out whether it wants anything from you.

So this is built as an instrument, with one governing rule:

> **Every control does something real.** No decorative knobs, no dead
> switches, no dials that turn nothing. The moment a panel carries
> ornament it stops being an instrument and becomes a costume.

Concretely that means:

- **The readout merges alerts from every app**, ordered by urgency then
  by when. You never cared which app an assessment deadline lives in;
  you cared that it is Thursday. That merge is the only thing a hub can
  do that a bookmark cannot.
- **CAPTURE puts things in.** `LOG` an application, `SNAP` a receipt,
  `NOTE` a thought, `DROP` a file — each posts to the owning app's API
  and the whole panel recalculates. This is the row that earns the page.
- **Meters show what the node actually reports.** Where a number is not
  available, the meter says so rather than showing a confident zero. A
  panel that lies once is a panel you stop reading.

## Apps are asked, never read

The hub never touches another app's database. Each app implements one
endpoint:

```
GET /api/status  ->  { app, level, headline, metrics[], alerts[], at }
```

That contract (`src/lib/contract.ts`) is the entire extent of what the
hub knows about an app. Consequences worth the constraint:

- Apps stay genuinely independent — own container, own database, own
  deploy, own release cadence. An app can rewrite its schema without the
  front door noticing.
- **Adding an app is one entry in `src/lib/registry.ts`** plus that
  endpoint. Nothing else in the hub changes.
- The types are declared here rather than in a package shared with the
  apps. They are separate repos that deploy on their own schedule; a
  shared dependency for twenty lines of types would couple releases that
  have no reason to be coupled. Each side declares the shape it needs
  and `parseStatus()` keeps the hub safe when an app disagrees.

## A broken app must not break the panel

The panel is *how you find out* an app is broken, so it is built to
survive them:

- Every app is asked in parallel behind a **1.5 second timeout**, so one
  hanging app costs the page a second and a half, not thirty.
- **Nothing throws.** A dead app becomes a `down` status and an unlit
  pad. An app returning malformed JSON reads as unreachable rather than
  rendering garbage.
- Verified by killing an app mid-session: the hub stayed up, marked it
  unreachable, and recovered on its own when it came back.

## Not installed is a first-class state

Apps in the registry with no URL are **not installed** — distinct from
*down*. Nothing is wrong; they do not exist yet. Their pads are dark and
their controls are dead, which makes the panel the roadmap as well as
the console, and means the screen looks finished on day one with a
single app running.

| | | |
|---|---|---|
| **Warden** | jobs, enforcement | live |
| **Nori** | money, receipts | planned |
| **Vault** | files | planned |
| **Archive** | memories | planned |
| **Registry** | project docs | planned |
| **Sentry** | monitoring | planned |

## Running it

```bash
pnpm install
cp .env.example .env.local     # point it at whatever you run
pnpm dev                       # http://localhost:3001
```

`.env.local` maps each app to a base URL. Leave one blank and it renders
as not installed:

```
WARDEN_URL="http://localhost:3000"
NORI_URL=""
```

## Adding your own app

1. Implement `GET /api/status` returning the shape in
   `src/lib/contract.ts`.
2. Optionally implement `POST /api/capture` to get a button on the
   CAPTURE row.
3. Add an entry to `src/lib/registry.ts` with a name, a role, a colour
   and a URL.

There is no step 4. The hub has no other knowledge of your app.

## Design

`design/commandhq-deck.html` is the standalone prototype — the panel
with every app installed and every control wired, useful for working on
the visual language without running the node.

It deliberately shares no typeface or palette with Warden. Warden is a
ledger; this is an instrument. Shared materials made early versions read
as one app wearing two hats.
