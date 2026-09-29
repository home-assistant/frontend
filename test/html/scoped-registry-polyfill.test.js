/**
 * @vitest-environment node
 */

import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import template from "lodash.template";
import { afterEach, describe, expect, it } from "vitest";
import {
  copyScopedRegistryPolyfill,
  scopedRegistryPolyfillFile,
  withReadyFlag,
} from "../../build-scripts/gulp/scoped-registry-polyfill.js";
import patterns from "../../src/util/stale-build-patterns.json";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

const POLYFILL_JS =
  "/frontend_latest/scoped-custom-element-registry.0123456789abcdef.js";

// Renders a page template as build-scripts/gulp/entry-html.js does.
const renderTemplate = (templateFile, data) =>
  template(readFileSync(templateFile, "utf-8"))({
    ...data,
    renderTemplate: (childTemplate) =>
      renderTemplate(
        path.resolve(path.dirname(templateFile), childTemplate),
        data
      ),
  });

const renderIndex = (hassUrl) =>
  renderTemplate(path.join(repoRoot, "src/html/index.html.template"), {
    modernRegex: "/modern/",
    hassUrl,
    staleBuildPatterns: patterns,
    useCacheRecovery: true,
    latestEntryJS: [
      "/frontend_latest/core.b1c2d3e4f5.js",
      "/frontend_latest/app.a1b2c3d4e5.js",
    ],
    es5EntryJS: [
      "/frontend_es5/core.c1d2e3f4a5.js",
      "/frontend_es5/app.d1e2f3a4b5.js",
    ],
    latestCustomPanelJS: "/frontend_latest/custom-panel.e1f2a3b4c5.js",
    es5CustomPanelJS: "/frontend_es5/custom-panel.f1a2b3c4d5.js",
    scopedRegistryJS: POLYFILL_JS,
  });

// Runs the loader scripts that follow the polyfill script, with Core's Jinja
// loops rendered for one extra module and one legacy extra script, and returns
// the URLs that they start to load.
const startedLoads = (html, { installed, modern, globals = {} }) => {
  const scripts = [...new JSDOM(html).window.document.scripts];
  const polyfillAt = scripts.findIndex(
    (script) => script.getAttribute("src") === POLYFILL_JS
  );
  const loaders = scripts
    .slice(polyfillAt + 1)
    .map((script) => script.textContent)
    .filter((source) => /import\(|_ls\("/.test(source))
    .filter((source) => !source.includes("function _ls"));
  const started = [];
  const win = installed
    ? { ...globals, __haScopedRegistryReady: true }
    : { ...globals };
  for (const source of loaders) {
    const js = source
      .replace(
        /\{%-? for extra_module in extra_modules -?%\}([\s\S]*?)\{%-? endfor -?%\}/,
        (_match, body) =>
          body.replaceAll("{{ extra_module }}", "/local/card.js")
      )
      .replace(
        /\{%-? for extra_script in extra_js_es5 -?%\}([\s\S]*?)\{%-? endfor -?%\}/,
        (_match, body) =>
          body.replaceAll("{{ extra_script }}", "/local/legacy.js")
      )
      .replace(/\bimport\(/g, "loadModule(");
    // eslint-disable-next-line no-new-func
    new Function("window", "isModern", "_ls", "loadModule", "console", js)(
      win,
      modern,
      (src) => started.push(src),
      (src) => {
        started.push(src);
        return Promise.resolve();
      },
      { error: () => undefined }
    );
  }
  return started;
};

const PACKAGE_MAP = path.join(
  repoRoot,
  "node_modules/@webcomponents/scoped-custom-element-registry/scoped-custom-element-registry.min.js.map"
);

const temporaryDirectories = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

// Writes the production polyfill file as the build does.
const buildPolyfill = () => {
  const dir = mkdtempSync(path.join(tmpdir(), "scoped-registry-"));
  temporaryDirectories.push(dir);
  copyScopedRegistryPolyfill(dir, true);
  const name = scopedRegistryPolyfillFile(true);
  return { dir, name, source: readFileSync(path.join(dir, name), "utf-8") };
};

// A page before the app loads, which can run a classic script.
const freshWindow = () =>
  new JSDOM("<!doctype html><home-assistant></home-assistant>", {
    runScripts: "outside-only",
  }).window;

describe("scoped custom element registry polyfill", () => {
  it.each([
    [
      "served by core",
      "",
      [
        'import("/frontend_latest/core.b1c2d3e4f5.js")',
        'import("/frontend_latest/app.a1b2c3d4e5.js")',
        'import("{{ extra_module }}")',
        '_ls("/frontend_es5/app.d1e2f3a4b5.js", true)',
        '_ls("{{ extra_script }}")',
      ],
    ],
    [
      "connected to a remote core",
      "http://ha.local:8123",
      [
        'import("/frontend_latest/core.b1c2d3e4f5.js")',
        'import("/frontend_latest/app.a1b2c3d4e5.js")',
        '_ls("/frontend_es5/app.d1e2f3a4b5.js", true)',
      ],
    ],
  ])(
    "loads as a classic script before every module and script, on a page %s",
    (_name, hassUrl, laterLoads) => {
      const html = renderIndex(hassUrl);
      const polyfillAt = html.indexOf(`<script src="${POLYFILL_JS}"></script>`);
      expect(polyfillAt).toBeGreaterThan(-1);
      for (const load of laterLoads) {
        expect(html.indexOf(load), load).toBeGreaterThan(polyfillAt);
      }
    }
  );

  it("starts the app entries and the extra modules once the polyfill is installed", () => {
    const html = renderIndex("");
    expect(startedLoads(html, { installed: true, modern: true })).toEqual([
      "/frontend_latest/core.b1c2d3e4f5.js",
      "/frontend_latest/app.a1b2c3d4e5.js",
      "/local/card.js",
    ]);
    expect(startedLoads(html, { installed: true, modern: false })).toEqual([
      "/local/card.js",
      "/frontend_es5/core.c1d2e3f4a5.js",
      "/frontend_es5/app.d1e2f3a4b5.js",
      "/local/legacy.js",
    ]);
  });

  it("starts nothing when the polyfill did not install", () => {
    const html = renderIndex("");
    expect(startedLoads(html, { installed: false, modern: true })).toEqual([]);
    expect(startedLoads(html, { installed: false, modern: false })).toEqual([]);
  });

  it("starts nothing when only the polyfill configuration object exists", () => {
    // An earlier script can set this object to configure the polyfill.
    const globals = {
      CustomElementRegistryPolyfill: { formAssociated: new Set() },
    };
    const html = renderIndex("");
    expect(
      startedLoads(html, { installed: false, modern: true, globals })
    ).toEqual([]);
  });

  it("marks the install as complete after the polyfill replaced the registry", () => {
    const win = freshWindow();
    const nativeRegistry = win.customElements;
    win.eval(buildPolyfill().source);
    expect(win.customElements).not.toBe(nativeRegistry);
    expect(win.__haScopedRegistryReady).toBe(true);
  });

  it.each([
    [
      "before it replaces the registry",
      (win) =>
        Object.defineProperty(win.customElements, "define", {
          get: () => {
            throw new Error("broken define");
          },
        }),
      false,
    ],
    [
      "after it replaced the registry",
      (win) =>
        Object.defineProperty(win, "ElementInternals", {
          get: () => {
            throw new Error("broken ElementInternals");
          },
        }),
      true,
    ],
  ])(
    "leaves the install unmarked when the polyfill throws %s",
    (_name, breakWindow, registryReplaced) => {
      const win = freshWindow();
      const nativeRegistry = win.customElements;
      breakWindow(win);
      expect(() => win.eval(buildPolyfill().source)).toThrow();
      expect(win.CustomElementRegistryPolyfill).toBeDefined();
      expect(win.customElements !== nativeRegistry).toBe(registryReplaced);
      expect(win.__haScopedRegistryReady).toBeUndefined();
    }
  );

  it("leaves the install unmarked when the file is cut off", () => {
    const win = freshWindow();
    const { source } = buildPolyfill();
    // The error comes from the page, so it is the page's SyntaxError.
    expect(() => win.eval(source.slice(0, source.length / 2))).toThrow(
      win.SyntaxError
    );
    expect(win.__haScopedRegistryReady).toBeUndefined();
  });

  it("runs the flag after package code that ends in a line comment", () => {
    const win = freshWindow();
    win.eval(
      withReadyFlag(
        "window.packageRan = true; // no newline",
        "polyfill.js.map"
      )
    );
    expect(win.packageRan).toBe(true);
    expect(win.__haScopedRegistryReady).toBe(true);
  });

  it("names the production file after a hash of its content", () => {
    const { name, source } = buildPolyfill();
    const hash = createHash("sha256").update(source).digest("hex").slice(0, 16);
    expect(name).toBe(`scoped-custom-element-registry.${hash}.js`);
  });

  it("ends the file with a source map comment for an unchanged copy of the package map", () => {
    const { dir, source } = buildPolyfill();
    const lastLine = source.trimEnd().split("\n").at(-1);
    const mapName = /^\/\/# sourceMappingURL=(\S+)$/.exec(lastLine)?.[1];
    expect(mapName).toMatch(
      /^scoped-custom-element-registry\.[0-9a-f]{16}\.js\.map$/
    );
    expect(readFileSync(path.join(dir, mapName))).toEqual(
      readFileSync(PACKAGE_MAP)
    );
  });

  it("names the source map after a hash of its content", () => {
    const { source } = buildPolyfill();
    const hash = createHash("sha256")
      .update(readFileSync(PACKAGE_MAP))
      .digest("hex")
      .slice(0, 16);
    expect(source.trimEnd()).toMatch(
      new RegExp(
        `\\n//# sourceMappingURL=scoped-custom-element-registry\\.${hash}\\.js\\.map$`
      )
    );
  });

  it("names the production file so that the stale build guard covers it", () => {
    const hashedPath = new RegExp(`^(?:${patterns.hashedEntry})$`, "i");
    expect(`/frontend_latest/${scopedRegistryPolyfillFile(true)}`).toMatch(
      hashedPath
    );
  });
});
