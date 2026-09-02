/**
 * @vitest-environment node
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import template from "lodash.template";
import { beforeEach, describe, expect, it, vi } from "vitest";
import patterns from "../../src/util/stale-build-patterns.json";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

const ORIGIN = "http://ha.local";
const CORE_ENTRY = "/frontend_latest/core.b1c2d3e4f5.js";
const APP_ENTRY = "/frontend_latest/app.a1b2c3d4e5.js";
const CHUNK = `${ORIGIN}/frontend_latest/45995.dce03284ae03.js`;

// The boot guard is inline in index.html: it runs before any bundle loads, so
// it is neither type-checked nor covered by the bundled recovery tests. Here it
// is rendered exactly as the build renders it, then evaluated with every global
// it touches passed in — which isolates it from the real environment and makes
// the reload observable without navigating.
const renderGuard = template(
  readFileSync(
    path.join(repoRoot, "src/html/_bootstrap_recovery.html.template"),
    "utf-8"
  )
);

const guardSource = (latestEntryJS) => {
  const rendered = renderGuard({
    staleBuildPatterns: patterns,
    latestEntryJS,
    es5EntryJS: ["/frontend_es5/app.f6a7b8c9d0.js"],
  });
  // The template is a single script block; take what is between the tags.
  return rendered.slice(
    rendered.indexOf("\n"),
    rendered.lastIndexOf("</script>")
  );
};

const importFailure = (url) =>
  `error loading dynamically imported module: ${url}`;

describe("index.html boot recovery guard", () => {
  /** @type {{ method: string, url: string, cache: string }[]} */
  let probes;
  /** Status per requested URL: a number, "error" or "hang". */
  let statusFor;
  /** Pending timeout callbacks, so the probe timeout is deterministic. */
  let timeouts;
  /** Resolvers of requests that never answer on their own. */
  let hanging;
  let location;
  let infoBox;
  let booted;
  let storage;

  const fakeStorage = () => {
    const entries = new Map();
    return {
      getItem: (key) => entries.get(key) ?? null,
      setItem: (key, value) => entries.set(key, String(value)),
      removeItem: (key) => entries.delete(key),
    };
  };

  const runGuard = (latestEntryJS = [CORE_ENTRY, APP_ENTRY]) => {
    const env = {
      window: Object.assign(new EventTarget(), { latestJS: true }),
      document: {
        getElementById: (id) => {
          if (id === "ha-launch-screen") {
            return booted ? null : {};
          }
          return id === "ha-launch-screen-info-box" ? infoBox : null;
        },
      },
      location,
      // No controlling service worker: recover() navigates straight away.
      navigator: { serviceWorker: { controller: null } },
      self: { caches: undefined },
      caches: undefined,
      sessionStorage: storage,
      setTimeout: (fn) => {
        timeouts.push(fn);
        return timeouts.length;
      },
      fetch: (url, options) => {
        probes.push({ method: options.method, url, cache: options.cache });
        const status = statusFor(url);
        if (status === "error") {
          return Promise.reject(new TypeError("Failed to fetch"));
        }
        if (status === "hang") {
          // Never settles on its own; the probe's timeout decides.
          return new Promise((resolve) => {
            hanging.push(resolve);
          });
        }
        return Promise.resolve({ status });
      },
    };
    // eslint-disable-next-line no-new-func
    new Function(...Object.keys(env), guardSource(latestEntryJS))(
      ...Object.values(env)
    );
    return env.window;
  };

  const failImport = (win, message) => {
    const event = new Event("unhandledrejection");
    event.reason = new Error(message);
    win.dispatchEvent(event);
    return new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  };

  beforeEach(() => {
    probes = [];
    statusFor = () => 404;
    timeouts = [];
    hanging = [];
    booted = false;
    infoBox = { textContent: "" };
    storage = fakeStorage();
    location = {
      origin: ORIGIN,
      href: `${ORIGIN}/lovelace/0`,
      pathname: "/lovelace/0",
      search: "",
      hash: "",
      replace: vi.fn(),
    };
  });

  it("reloads with a cache-busting param when the chunk is gone", async () => {
    const win = runGuard();

    await failImport(win, importFailure(CHUNK));

    expect(probes).toEqual([{ method: "HEAD", url: CHUNK, cache: "no-store" }]);
    expect(location.replace).toHaveBeenCalledOnce();
    expect(location.replace.mock.calls[0][0]).toMatch(
      /^\/lovelace\/0\?ha_cache_bust=\d+$/
    );
  });

  it.each([
    ["the chunk is still on the server", 200],
    ["the server is unreachable", "error"],
    ["the server errors without deleting anything", 502],
  ])("does not reload when %s", async (_case, status) => {
    statusFor = () => status;
    const win = runGuard();

    await failImport(win, importFailure(CHUNK));

    // Probed, then left alone: a reload cannot fix a transport failure.
    expect(probes).toHaveLength(1);
    expect(location.replace).not.toHaveBeenCalled();
  });

  it("does not reload when the probe does not answer in time", async () => {
    statusFor = () => "hang";
    const win = runGuard();

    await failImport(win, importFailure(CHUNK));
    timeouts.forEach((fn) => fn());
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(location.replace).not.toHaveBeenCalled();
  });

  it.each([
    "Failed to fetch dynamically imported module: /local/layout-card.js",
    `error loading dynamically imported module: ${ORIGIN}/hacsfiles/silam/forecast.js`,
    `error loading dynamically imported module: ${ORIGIN}/[/hacsfiles/card-mod/card-mod.js?hacstag=1]`,
    // Our path, someone else's host: still not a file we ship.
    "error loading dynamically imported module: https://cdn.example/frontend_latest/app.a1b2c3d4e5.js",
    // Our path nested under theirs: also not a file we ship.
    `error loading dynamically imported module: ${ORIGIN}/local/frontend_latest/custom.a1b2c3d4e5.js`,
  ])(
    "ignores a failure of a file this build does not ship: %s",
    async (message) => {
      const win = runGuard();

      // A foreign module failure must not be mistaken for a stale build.
      await failImport(win, message);

      expect(probes).toHaveLength(0);
      expect(location.replace).not.toHaveBeenCalled();
      expect(storage.getItem("haStaleBuildReload")).toBeNull();
    }
  );

  it("probes each failing entry, so a served one cannot hide a deleted one", async () => {
    const gone = `${ORIGIN}${APP_ENTRY}`;
    statusFor = (url) => (url === gone ? 404 : 200);
    const win = runGuard();

    await Promise.all([
      failImport(win, importFailure(`${ORIGIN}${CORE_ENTRY}`)),
      failImport(win, importFailure(gone)),
    ]);

    expect(probes.map((probe) => probe.url)).toEqual([
      `${ORIGIN}${CORE_ENTRY}`,
      gone,
    ]);
    expect(location.replace).toHaveBeenCalledOnce();
  });

  it("does not show the fatal message while a recovery is navigating", async () => {
    // Both entries are gone, so both probes confirm it moments apart.
    const win = runGuard();

    await Promise.all([
      failImport(win, importFailure(`${ORIGIN}${CORE_ENTRY}`)),
      failImport(win, importFailure(`${ORIGIN}${APP_ENTRY}`)),
    ]);

    expect(probes).toHaveLength(2);
    expect(location.replace).toHaveBeenCalledOnce();
    expect(infoBox.textContent).toBe("");
  });

  it("asks about the same URL only once while a probe is in flight", async () => {
    statusFor = () => "hang";
    const win = runGuard();

    await Promise.all([
      failImport(win, importFailure(CHUNK)),
      failImport(win, importFailure(CHUNK)),
    ]);

    expect(probes).toHaveLength(1);
  });

  it("probes this build's entry when the message names no file", async () => {
    const win = runGuard();

    // Safari's message names nothing, so the entry bundle stands in.
    await failImport(win, "Importing a module script failed.");

    expect(probes[0].url).toBe(`${ORIGIN}${CORE_ENTRY}`);
    expect(location.replace).toHaveBeenCalledOnce();
  });

  it("does not reload on a guess when there is nothing to probe", async () => {
    const win = runGuard([]);

    await failImport(win, "Importing a module script failed.");

    expect(probes).toHaveLength(0);
    expect(location.replace).not.toHaveBeenCalled();
  });

  it("says so when the app never takes over and a reload would not help", async () => {
    statusFor = () => 200;
    const win = runGuard();

    await failImport(win, importFailure(CHUNK));
    timeouts.forEach((fn) => fn());
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(location.replace).not.toHaveBeenCalled();
    expect(infoBox.textContent).toContain("Could not load Home Assistant");
  });

  it("stays quiet when the app takes over after all", async () => {
    statusFor = () => 200;
    const win = runGuard();

    await failImport(win, importFailure(CHUNK));
    // The browser retried the failed modulepreload and the app came up.
    booted = true;
    timeouts.forEach((fn) => fn());
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(infoBox.textContent).toBe("");
  });

  it("stays inert once the app has booted", async () => {
    booted = true;
    const win = runGuard();

    await failImport(win, importFailure(CHUNK));

    // Post-boot failures belong to the bundled recovery, not this guard.
    expect(probes).toHaveLength(0);
    expect(location.replace).not.toHaveBeenCalled();
  });

  it("claims the shared reload budget when it recovers", async () => {
    const win = runGuard();

    await failImport(win, importFailure(CHUNK));

    expect(location.replace).toHaveBeenCalledOnce();
    expect(JSON.parse(storage.getItem("haStaleBuildReload"))).toMatchObject({
      n: 1,
    });
  });

  it("does not reload again after a recent reload, even without the param", async () => {
    // core.ts strips ha_cache_bust from the URL on every successful connect, so
    // the param cannot bound the loop across page loads — the marker does.
    storage.setItem(
      "haStaleBuildReload",
      JSON.stringify({ n: 1, t: Date.now() })
    );
    const win = runGuard();

    await failImport(win, importFailure(CHUNK));

    expect(location.replace).not.toHaveBeenCalled();
    expect(infoBox.textContent).toContain("Could not load Home Assistant");
  });

  it("reloads again once the cooldown has passed", async () => {
    storage.setItem(
      "haStaleBuildReload",
      JSON.stringify({ n: 1, t: Date.now() - 61_000 })
    );
    const win = runGuard();

    await failImport(win, importFailure(CHUNK));

    expect(location.replace).toHaveBeenCalledOnce();
  });

  it("replaces a marker it cannot read", async () => {
    storage.setItem("haStaleBuildReload", "not json");
    const win = runGuard();

    await failImport(win, importFailure(CHUNK));

    // Recovered once, and left a marker that bounds the next boot — an
    // unreadable one must not hand out a reload on every page load.
    expect(location.replace).toHaveBeenCalledOnce();
    expect(JSON.parse(storage.getItem("haStaleBuildReload"))).toMatchObject({
      n: 1,
    });
  });

  it("still recovers when session storage is unavailable", async () => {
    // Private mode / blocked storage: fall back to the bust param alone rather
    // than losing the stale-index recovery altogether.
    storage.getItem = () => {
      throw new Error("denied");
    };
    const win = runGuard();

    await failImport(win, importFailure(CHUNK));

    expect(location.replace).toHaveBeenCalledOnce();
  });

  it("shows a message instead of reloading twice", async () => {
    location.search = "?ha_cache_bust=123";
    const win = runGuard();

    await failImport(win, importFailure(CHUNK));

    expect(location.replace).not.toHaveBeenCalled();
    expect(infoBox.textContent).toContain("Could not load Home Assistant");
  });
});
