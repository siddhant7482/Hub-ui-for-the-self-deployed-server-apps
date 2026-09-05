import { cpSync, existsSync, rmSync } from "node:fs";

/* ============================================================
   The step Next does not do for you.

   With output: "standalone", `next build` writes a self-contained
   server to .next/standalone but deliberately leaves .next/static
   and public/ out of it — the docs assume a Docker COPY will place
   them, and say so in one line that is very easy to miss.

   Skipping it does not fail the build, does not warn, and does not
   break the page. The HTML renders perfectly; every stylesheet and
   script 404s. You get an unstyled wall of serif text and no clue
   why, and because `next build` also RECREATES .next/standalone,
   a rebuild silently un-does a copy that was done by hand earlier.

   That is exactly how it broke here once. Doing it in postbuild
   means `pnpm build` is the whole story, on the node and on a dev
   machine, and there is no ritual left to forget.

   node:fs rather than `cp -r` so this works on Windows too.
   ============================================================ */

const dest = ".next/standalone/.next/static";

if (!existsSync(".next/standalone")) {
  console.log("postbuild: no standalone output, nothing to assemble");
  process.exit(0);
}

rmSync(dest, { recursive: true, force: true });
cpSync(".next/static", dest, { recursive: true });
console.log(`postbuild: ${dest}`);

/* No public/ in this repo today — the icon is src/app/icon.svg, an
 * App Router convention that the server build already carries. Copied
 * anyway so adding public/ later needs no change here. */
if (existsSync("public")) {
  rmSync(".next/standalone/public", { recursive: true, force: true });
  cpSync("public", ".next/standalone/public", { recursive: true });
  console.log("postbuild: .next/standalone/public");
}
