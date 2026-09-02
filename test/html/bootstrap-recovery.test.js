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

// The boot guard is inline ES5 in index.html: it runs before any bundle loads,
// so it is neither type-checked nor covered by the bundled recovery tests. Here
// it is rendered exactly as the build renders it, then evaluated with every
// global it touches passed in — which isolates it from the real environment and
// makes the reload observable without navigating.
const GUARD = template(
  readFileSync(
    path.join(repoRoot, "src/html/_bootstrap_recovery.html.template"),
    "utf-8"
  )
)({ staleBuildPatterns: patterns })
  .replace(/^\s*<script>/, "")
  .replace(/<\/script>\s*$/, "");

const CHUNK_URL = "http://ha.local/frontend_latest/core.abc12345def.js";
const IMPORT_FAILURE = `error loading dynamically imported module: ${CHUNK_URL}`;

describe("index.html boot recovery guard", () => {
  /** @type {{ method: string, url: string }[]} */
  let probes;
  /** @type {number | "error" | "timeout"} */
  let probeStatus;
  let location;
  let infoBox;
  let booted;
  let storage;

  /** Minimal sessionStorage, so the reload budget can be inspected and reset. */
  const fakeStorage = () => {
    const entries = new Map();
    return {
      entries,
      getItem: (key) => entries.get(key) ?? null,
      setItem: (key, value) => entries.set(key, String(value)),
      removeItem: (key) => entries.delete(key),
    };
  };

  const runGuard = () => {
    class FakeXMLHttpRequest {
      constructor() {
        this.status = 0;
        this.timeout = 0;
        this.onload = null;
        this.onerror = null;
        this.ontimeout = null;
      }

      open(method, url) {
        this._method = method;
        this._url = url;
      }

      setRequestHeader(name, value) {
        this._headers = { ...this._headers, [name]: value };
      }

      send() {
        probes.push({
          method: this._method,
          url: this._url,
          headers: this._headers,
        });
        // Answer out of band, like a real request.
        Promise.resolve().then(() => {
          if (probeStatus === "error") {
            this.onerror?.();
          } else if (probeStatus === "timeout") {
            this.ontimeout?.();
          } else {
            this.status = probeStatus;
            this.onload?.();
          }
        });
      }
    }

    const env = {
      window: new EventTarget(),
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
      XMLHttpRequest: FakeXMLHttpRequest,
    };
    // eslint-disable-next-line no-new-func
    new Function(...Object.keys(env), GUARD)(...Object.values(env));
    return env.window;
  };

  const failImport = (win, message) => {
    const event = new Event("unhandledrejection");
    event.reason = new Error(message);
    win.dispatchEvent(event);
    // Let the probe answer.
    return new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  };

  beforeEach(() => {
    probes = [];
    probeStatus = 404;
    booted = false;
    infoBox = { textContent: "" };
    storage = fakeStorage();
    location = {
      pathname: "/lovelace/0",
      search: "",
      hash: "",
      replace: vi.fn(),
    };
  });

  it("reloads with a cache-busting param when the chunk is gone", async () => {
    const win = runGuard();

    await failImport(win, IMPORT_FAILURE);

    expect(probes).toEqual([
      {
        method: "HEAD",
        url: CHUNK_URL,
        // Never answered from a cache, so the verdict is the server's own.
        headers: { "Cache-Control": "no-cache" },
      },
    ]);
    expect(location.replace).toHaveBeenCalledOnce();
    expect(location.replace.mock.calls[0][0]).toMatch(
      /^\/lovelace\/0\?ha_cache_bust=\d+$/
    );
  });

  it.each([
    ["the chunk is still on the server", 200],
    ["the server is unreachable", "error"],
    ["the server does not answer in time", "timeout"],
    ["the server errors without deleting anything", 502],
  ])("does not reload when %s", async (_case, status) => {
    probeStatus = status;
    const win = runGuard();

    await failImport(win, IMPORT_FAILURE);

    // Probed, then left alone: a reload cannot fix a transport failure.
    expect(probes).toHaveLength(1);
    expect(location.replace).not.toHaveBeenCalled();
  });

  it("probes once for a burst of failures", async () => {
    probeStatus = 200;
    const win = runGuard();

    await Promise.all([
      failImport(win, IMPORT_FAILURE),
      failImport(
        win,
        "error loading dynamically imported module: " +
          "http://ha.local/frontend_latest/app.def67890ab.js"
      ),
    ]);

    expect(probes).toHaveLength(1);
    expect(location.replace).not.toHaveBeenCalled();
  });

  it.each([
    "Failed to fetch dynamically imported module: /local/layout-card.js",
    "error loading dynamically imported module: " +
      "http://ha.local/hacsfiles/silam_pollen/forecast-card.js",
    "error loading dynamically imported module: " +
      "http://ha.local/[/hacsfiles/card-mod/card-mod.js?hacstag=1]",
  ])(
    "ignores a failure of a file this build does not ship: %s",
    async (message) => {
      const win = runGuard();

      // index.html imports extra modules without a catch, so a broken one
      // rejects into this guard on every page load.
      await failImport(win, message);

      expect(probes).toHaveLength(0);
      expect(location.replace).not.toHaveBeenCalled();
      expect(storage.getItem("haStaleBuildReload")).toBeNull();
    }
  );

  it("reloads without probing when the message carries no URL", async () => {
    const win = runGuard();

    // Safari's message names no file, so there is nothing to ask about.
    await failImport(win, "Importing a module script failed.");

    expect(probes).toHaveLength(0);
    expect(location.replace).toHaveBeenCalledOnce();
  });

  it("stays inert once the app has booted", async () => {
    booted = true;
    const win = runGuard();

    await failImport(win, IMPORT_FAILURE);

    // Post-boot failures belong to the bundled recovery, not this guard.
    expect(probes).toHaveLength(0);
    expect(location.replace).not.toHaveBeenCalled();
  });

  it("claims the shared reload budget when it recovers", async () => {
    const win = runGuard();

    await failImport(win, IMPORT_FAILURE);

    expect(location.replace).toHaveBeenCalledOnce();
    expect(JSON.parse(storage.getItem("haStaleBuildReload"))).toMatchObject({
      n: 1,
    });
  });

  it("does not reload again after a recent reload, even without the param", async () => {
    // core.ts strips ha_cache_bust from the URL on every successful connect, so
    // the param cannot bound the loop across page loads - the marker does.
    storage.setItem(
      "haStaleBuildReload",
      JSON.stringify({ n: 1, t: Date.now() })
    );
    const win = runGuard();

    await failImport(win, IMPORT_FAILURE);

    expect(location.replace).not.toHaveBeenCalled();
    expect(infoBox.textContent).toContain("Could not load Home Assistant");
  });

  it("reloads again once the cooldown has passed", async () => {
    storage.setItem(
      "haStaleBuildReload",
      JSON.stringify({ n: 1, t: Date.now() - 61_000 })
    );
    const win = runGuard();

    await failImport(win, IMPORT_FAILURE);

    expect(location.replace).toHaveBeenCalledOnce();
  });

  it("still recovers when session storage is unavailable", async () => {
    // Private mode / blocked storage: fall back to the bust param alone rather
    // than losing the stale-index recovery altogether.
    storage.getItem = () => {
      throw new Error("denied");
    };
    const win = runGuard();

    await failImport(win, IMPORT_FAILURE);

    expect(location.replace).toHaveBeenCalledOnce();
  });

  it("shows a message instead of reloading twice", async () => {
    location.search = "?ha_cache_bust=123";
    const win = runGuard();

    await failImport(win, IMPORT_FAILURE);

    expect(location.replace).not.toHaveBeenCalled();
    expect(infoBox.textContent).toContain("Could not load Home Assistant");
  });
});
