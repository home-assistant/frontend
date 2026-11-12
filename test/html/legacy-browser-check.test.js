/**
 * @vitest-environment node
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import template from "lodash.template";
import { describe, expect, it } from "vitest";
import patterns from "../../src/util/stale-build-patterns.json";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

const ENTRY = "/frontend_es5/app.d1e2f3a4b5.js";
const ACCEPTED_KEY = "haUnsupportedBrowserAccepted";

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

// The legacy browser check script from index.html.
const legacyCheckScript = () => {
  const html = renderTemplate(
    path.join(repoRoot, "src/html/index.html.template"),
    {
      modernRegex: "/modern/",
      hassUrl: "",
      staleBuildPatterns: patterns,
      useCacheRecovery: true,
      latestEntryJS: ["/frontend_latest/app.a1b2c3d4e5.js"],
      es5EntryJS: [ENTRY],
      latestCustomPanelJS: "/frontend_latest/custom-panel.e1f2a3b4c5.js",
      es5CustomPanelJS: "/frontend_es5/custom-panel.f1a2b3c4d5.js",
    }
  );
  return html
    .split("<script>")
    .map((part) => part.slice(0, part.indexOf("</script>")))
    .find((part) => part.includes("haUnsupportedBrowserAccepted"));
};

const fakeElement = (tag) => {
  const el = {
    tag,
    children: [],
    listeners: {},
    appendChild: (child) => {
      el.children.push(child);
      return child;
    },
    removeChild: (child) => {
      el.children = el.children.filter((c) => c !== child);
      return child;
    },
    addEventListener: (type, listener) => {
      el.listeners[type] = listener;
    },
  };
  let text = "";
  Object.defineProperty(el, "textContent", {
    get: () => text,
    set: (value) => {
      text = value;
      el.children = [];
    },
  });
  return el;
};

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 10);

const run = ({
  bigInt = false,
  dialog = true,
  stored,
  now = NOW,
  storageThrows = false,
}) => {
  const started = [];
  const box = fakeElement("div");
  const store = stored ? { [ACCEPTED_KEY]: stored } : {};
  const storage = {
    getItem: (key) => {
      if (storageThrows) throw new Error("SecurityError");
      return key in store ? store[key] : null;
    },
    setItem: (key, value) => {
      if (storageThrows) throw new Error("SecurityError");
      store[key] = value;
    },
  };
  const doc = {
    createElement: (tag) =>
      tag === "dialog"
        ? { showModal: dialog ? () => undefined : undefined }
        : fakeElement(tag),
    createTextNode: (text) => ({ tag: "#text", textContent: text }),
    getElementById: (id) => (id === "ha-launch-screen-info-box" ? box : null),
  };
  // eslint-disable-next-line no-new-func
  new Function(
    "window",
    "document",
    "localStorage",
    "BigInt",
    "Date",
    "_ls",
    legacyCheckScript()
  )(
    { latestJS: false },
    doc,
    storage,
    bigInt ? () => undefined : undefined,
    { now: () => now },
    (src) => started.push(src)
  );
  const actions =
    box.children.find((child) => child.tag === "div")?.children ?? [];
  const continueAnyway = actions.find((child) => child.tag === "button")
    ?.listeners.click;
  const checkbox = actions
    .find((child) => child.tag === "label")
    ?.children.find((child) => child.tag === "input");
  const shown = box.children.map((child) => child.tag);
  return { started, box, store, continueAnyway, checkbox, shown };
};

describe("index.html legacy browser check", () => {
  it("loads the app on a browser at the floor", () => {
    const { started, box } = run({ bigInt: true, dialog: true });
    expect(started).toEqual([ENTRY]);
    expect(box.children).toEqual([]);
  });

  it.each([
    ["BigInt", { bigInt: false, dialog: true }],
    ["native dialog", { bigInt: true, dialog: false }],
  ])("offers to continue without %s", (_, browser) => {
    const { started, box, store, continueAnyway, checkbox } = run(browser);
    expect(started).toEqual([]);
    expect(checkbox).toBeUndefined();

    continueAnyway();
    expect(started).toEqual([ENTRY]);
    expect(store[ACCEPTED_KEY]).toBe(String(NOW));
    // The message stays up while the app loads.
    expect(box.children.map((child) => child.tag)).toEqual(["p"]);
  });

  it("does not ask again within a month", () => {
    const { started, shown } = run({ stored: String(NOW - 29 * DAY) });
    expect(started).toEqual([ENTRY]);
    expect(shown).toEqual(["p"]);
  });

  it("reminds after a month, and can be turned off", () => {
    const stored = String(NOW - 30 * DAY);
    const reminder = run({ stored });
    expect(reminder.started).toEqual([]);
    expect(reminder.checkbox.type).toBe("checkbox");

    // Unchecked: starts the next month.
    const continued = run({ stored });
    continued.continueAnyway();
    expect(continued.started).toEqual([ENTRY]);
    expect(continued.store[ACCEPTED_KEY]).toBe(String(NOW));

    reminder.checkbox.checked = true;
    reminder.continueAnyway();
    expect(reminder.started).toEqual([ENTRY]);
    expect(reminder.store[ACCEPTED_KEY]).toBe("always");
    expect(run({ stored: "always", now: NOW + 3650 * DAY }).started).toEqual([
      ENTRY,
    ]);
  });

  // A tablet that lost its clock.
  it("asks again when the clock is behind the stored time", () => {
    const { started, continueAnyway } = run({ stored: String(NOW + DAY) });
    expect(started).toEqual([]);
    expect(continueAnyway).toBeDefined();
  });

  it("still continues when storage is unavailable", () => {
    const { started, continueAnyway } = run({ storageThrows: true });
    expect(started).toEqual([]);
    continueAnyway();
    expect(started).toEqual([ENTRY]);
  });
});
