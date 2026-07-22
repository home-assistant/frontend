import { describe, it, expect } from "vitest";
import {
  collectConfigTemplates,
  applyConfigTemplates,
  pathKey,
} from "../../../../src/panels/lovelace/common/resolve-config-templates";

// Helper: render a set of {pathKey -> value} from a list of [path, value].
const results = (entries: [(string | number)[], unknown][]) =>
  new Map(entries.map(([p, v]) => [pathKey(p), v]));

describe("collectConfigTemplates", () => {
  it("collects a simple leaf template", () => {
    const config = { type: "tile", name: "{{ states('sensor.x') }}" };
    const found = collectConfigTemplates(config);
    expect(found).toEqual([
      { path: ["name"], template: "{{ states('sensor.x') }}" },
    ]);
  });

  it("collects mixed literal + template strings and {% %} blocks", () => {
    const config = {
      type: "markdown",
      title: "Hello {{ user }}",
      content: "{% if is_state('light.a','on') %}on{% endif %}",
      plain: "no template here",
    };
    const found = collectConfigTemplates(config).map((f) => f.path.join("."));
    expect(found.sort()).toEqual(["content", "title"]);
  });

  it("never treats structural keys as templates", () => {
    const config = {
      type: "tile",
      grid_options: { columns: 6 },
      layout_options: { grid_columns: 3 },
      view_layout: { position: "sidebar" },
      visibility: [{ condition: "state", entity: "x", state: "on" }],
    };
    expect(collectConfigTemplates(config)).toEqual([]);
  });

  it("recurses into nested objects (e.g. tap_action)", () => {
    const config = {
      type: "tile",
      entity: "light.a",
      tap_action: { action: "navigate", navigation_path: "/{{ area }}" },
    };
    const found = collectConfigTemplates(config);
    expect(found).toEqual([
      {
        path: ["tap_action", "navigation_path"],
        template: "/{{ area }}",
      },
    ]);
  });

  it("collects templates inside arrays by index", () => {
    const config = {
      type: "custom:foo",
      labels: ["static", "{{ now() }}", "also static"],
    };
    const found = collectConfigTemplates(config);
    expect(found).toEqual([{ path: ["labels", 1], template: "{{ now() }}" }]);
  });

  it("DELEGATES nested child card configs (does not resolve them at parent)", () => {
    // A vertical-stack with a templated field in a child card.
    // The parent resolver must NOT collect the child's template — the child's
    // own hui-card wrapper resolves it. This prevents double resolution and
    // keeps the recursion boundary clean.
    const config = {
      type: "vertical-stack",
      title: "{{ 'Parent ' ~ states('sensor.n') }}",
      cards: [
        { type: "tile", name: "{{ states('sensor.child') }}" },
        {
          type: "horizontal-stack",
          cards: [{ type: "markdown", content: "{{ deep }}" }],
        },
      ],
    };
    const found = collectConfigTemplates(config);
    // Only the parent's own field is collected.
    expect(found).toEqual([
      { path: ["title"], template: "{{ 'Parent ' ~ states('sensor.n') }}" },
    ]);
  });

  it("delegates picture-elements `elements` and card `features`", () => {
    const config = {
      type: "picture-elements",
      elements: [{ type: "state-label", entity: "{{ x }}" }],
      features: [{ type: "custom:foo", label: "{{ y }}" }],
    };
    expect(collectConfigTemplates(config)).toEqual([]);
  });
});

describe("applyConfigTemplates", () => {
  it("injects a rendered value at the collected path", () => {
    const config = { type: "tile", name: "{{ states('sensor.x') }}" };
    const resolved = applyConfigTemplates(
      config,
      results([[["name"], "Living room"]])
    );
    expect(resolved.name).toBe("Living room");
  });

  it("preserves native types from the backend (number, boolean)", () => {
    const config = {
      type: "gauge",
      min: "{{ 0 }}",
      max: "{{ 100 }}",
      needle: "{{ is_state('input_boolean.n','on') }}",
    };
    const resolved = applyConfigTemplates(
      config,
      results([
        [["min"], 0],
        [["max"], 100],
        [["needle"], true],
      ])
    );
    expect(resolved.min).toBe(0);
    expect(resolved.max).toBe(100);
    expect(resolved.needle).toBe(true);
    expect(typeof resolved.min).toBe("number");
    expect(typeof resolved.needle).toBe("boolean");
  });

  it("is immutable: the raw config keeps its templates (NO LOSS)", () => {
    const config = {
      type: "tile",
      entity: "light.a",
      tap_action: { action: "navigate", navigation_path: "/{{ area }}" },
    };
    const raw = structuredClone(config);
    const resolved = applyConfigTemplates(
      config,
      results([[["tap_action", "navigation_path"], "/living_room"]])
    );
    // resolved has the rendered value...
    expect((resolved.tap_action as any).navigation_path).toBe("/living_room");
    // ...but the original config is byte-for-byte unchanged.
    expect(config).toEqual(raw);
    expect((config.tap_action as any).navigation_path).toBe("/{{ area }}");
    // and nested containers were cloned, not shared
    expect(resolved.tap_action).not.toBe(config.tap_action);
  });

  it("leaves not-yet-rendered fields as their raw template", () => {
    const config = { type: "tile", a: "{{ one }}", b: "{{ two }}" };
    const resolved = applyConfigTemplates(config, results([[["a"], "A"]]));
    expect(resolved.a).toBe("A");
    expect(resolved.b).toBe("{{ two }}"); // still pending
  });

  it("returns the same object reference when there is nothing to apply", () => {
    const config = { type: "tile", name: "static" };
    const resolved = applyConfigTemplates(config, new Map());
    expect(resolved).toBe(config);
  });

  it("round-trips: collect -> render -> apply, parent field only", () => {
    const config = {
      type: "vertical-stack",
      title: "{{ 'T' }}",
      cards: [{ type: "tile", name: "{{ child }}" }],
    };
    const collected = collectConfigTemplates(config);
    const rendered = new Map(
      collected.map((c) => [pathKey(c.path), "rendered-title"])
    );
    const resolved = applyConfigTemplates(config, rendered);
    expect(resolved.title).toBe("rendered-title");
    // child card config passed through untouched for its own hui-card to resolve
    expect((resolved.cards as any)[0].name).toBe("{{ child }}");
  });
});
