import { describe, expect, it, vi } from "vitest";
import {
  DashboardActions,
  type DashboardAction,
  type DashboardActionContext,
} from "../../src/data/dashboard_actions";
import type { HomeAssistant } from "../../src/types";

const context: DashboardActionContext = {
  hass: { language: "en" } as HomeAssistant,
  host: document.createElement("div"),
  path: "/home",
  showDialog: vi.fn(),
};
const action = (id: DashboardAction["id"]): DashboardAction => ({
  id,
  icon: "mdi:phone",
  label: ({ hass }) => hass.language,
  execute: vi.fn(),
});

describe("dashboard action registrations", () => {
  it("replaces duplicate IDs without letting stale cleanup remove the new action", () => {
    const registry = new DashboardActions();
    const first = registry.register(action("example:call"));
    const second = registry.register(action("example:call"));
    first();
    expect(registry.resolve(context)).toHaveLength(1);
    second();
    expect(registry.resolve(context)).toHaveLength(0);
  });
  it("disposes the registered ID after the caller mutates its action", () => {
    const registry = new DashboardActions();
    const definition = action("example:original");
    const dispose = registry.register(definition);
    definition.id = "example:changed";
    registry.register(action("example:changed"));
    dispose();
    expect(registry.resolve(context).map((item) => item.action.id)).toEqual([
      "example:changed",
    ]);
  });
  it("resolves labels and visibility from the current context", () => {
    const registry = new DashboardActions();
    registry.register({
      ...action("example:call"),
      visible: (ctx) => ctx.path === "/home",
    });
    expect(registry.resolve(context)[0].label).toBe("en");
    expect(
      registry.resolve({
        ...context,
        hass: { language: "it" } as HomeAssistant,
      })[0].label
    ).toBe("it");
    expect(registry.resolve({ ...context, path: "/other" })).toEqual([]);
  });
  it("unsubscribes views without removing their registrations", () => {
    const registry = new DashboardActions();
    const listener = vi.fn();
    const stop = registry.subscribe(listener);
    registry.register(action("example:call"));
    stop();
    registry.register(action("another:call"));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(registry.resolve(context)).toHaveLength(2);
  });
  it("reports a failing action once until resolution recovers", () => {
    const report = vi.fn();
    context.host.addEventListener("write_log", report);
    vi.stubGlobal("reportError", undefined);
    try {
      const registry = new DashboardActions();
      let broken = true;
      let visible = true;
      registry.register({
        ...action("example:tools"),
        visible: () => visible,
        label: () => {
          if (broken) throw new Error("invalid label");
          return "Tools";
        },
      });
      registry.resolve(context);
      registry.resolve(context);
      expect(report).toHaveBeenCalledTimes(1);
      broken = false;
      expect(registry.resolve(context)[0].label).toBe("Tools");
      broken = true;
      registry.resolve(context);
      expect(report).toHaveBeenCalledTimes(2);
      visible = false;
      expect(registry.resolve(context)).toEqual([]);
      visible = true;
      registry.resolve(context);
      expect(report).toHaveBeenCalledTimes(3);
    } finally {
      context.host.removeEventListener("write_log", report);
      vi.unstubAllGlobals();
    }
  });
  it("isolates a broken resource and reports its exception", () => {
    const report = vi.fn();
    context.host.addEventListener("write_log", report);
    vi.stubGlobal("reportError", undefined);
    try {
      const registry = new DashboardActions();
      registry.register({
        ...action("broken:call"),
        label: () => {
          throw new Error("invalid label");
        },
      });
      registry.register(action("example:call"));
      expect(registry.resolve(context).map((item) => item.action.id)).toEqual([
        "example:call",
      ]);
      expect(report).toHaveBeenCalledOnce();
      expect(
        (report.mock.calls[0][0] as HTMLElementEventMap["write_log"]).detail.message
      ).toContain("broken:call");
    } finally {
      context.host.removeEventListener("write_log", report);
      vi.unstubAllGlobals();
    }
  });
});
