/**
 * @vitest-environment node
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import template from "lodash.template";
import { afterEach, describe, expect, it, vi } from "vitest";
import patterns from "../../src/util/stale-build-patterns.json";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

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

// The index script that starts the extra modules, with Core's Jinja loops
// rendered for one extra module and one legacy extra script.
const extraModulesScript = () => {
  const html = renderTemplate(
    path.join(repoRoot, "src/html/index.html.template"),
    {
      modernRegex: "/modern/",
      hassUrl: "",
      staleBuildPatterns: patterns,
      useCacheRecovery: true,
      latestEntryJS: ["/frontend_latest/app.a1b2c3d4e5.js"],
      es5EntryJS: ["/frontend_es5/app.d1e2f3a4b5.js"],
      latestCustomPanelJS: "/frontend_latest/custom-panel.e1f2a3b4c5.js",
      es5CustomPanelJS: "/frontend_es5/custom-panel.f1a2b3c4d5.js",
    }
  );
  const script = html
    .split("<script>")
    .map((part) => part.slice(0, part.indexOf("</script>")))
    .find((part) => part.includes("__haLoadExtraModules"));
  return script
    .replace(
      /\{%-? for extra_module in extra_modules -?%\}([\s\S]*?)\{%-? endfor -?%\}/,
      (_match, body) => body.replaceAll("{{ extra_module }}", "/local/card.js")
    )
    .replace(
      /\{%-? for extra_script in extra_js_es5 -?%\}([\s\S]*?)\{%-? endfor -?%\}/,
      (_match, body) =>
        body.replaceAll("{{ extra_script }}", "/local/legacy.js")
    )
    .replace(/\bimport\(/g, "loadModule(");
};

describe("index.html extra modules", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const setup = (latestJS) => {
    const win = { latestJS };
    const started = [];
    vi.stubGlobal("window", win);
    vi.resetModules();
    return {
      started,
      runIndexScript: () => {
        // eslint-disable-next-line no-new-func
        new Function("window", "_ls", "loadModule", extraModulesScript())(
          win,
          (src) => started.push(src),
          (src) => {
            started.push(src);
            return Promise.resolve();
          }
        );
      },
      // What app.ts runs right after the polyfill import.
      runAppEntry: () => import("../../src/resources/scoped-registry-ready"),
    };
  };

  it.each([
    ["modern", true, ["/local/card.js"]],
    ["legacy", false, ["/local/card.js", "/local/legacy.js"]],
  ])("waits for the app entry on the %s build", async (_, latestJS, all) => {
    const { started, runIndexScript, runAppEntry } = setup(latestJS);
    runIndexScript();
    expect(started).toEqual([]);
    await runAppEntry();
    expect(started).toEqual(all);
  });

  it.each([
    ["modern", true, ["/local/card.js"]],
    ["legacy", false, ["/local/card.js", "/local/legacy.js"]],
  ])(
    "starts right away when the app entry ran first on the %s build",
    async (_, latestJS, all) => {
      const { started, runIndexScript, runAppEntry } = setup(latestJS);
      await runAppEntry();
      expect(started).toEqual([]);
      runIndexScript();
      expect(started).toEqual(all);
    }
  );
});
