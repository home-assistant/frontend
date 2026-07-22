import { beforeEach, describe, expect, it, vi } from "vitest";
import { TemplateResolver } from "../../../../src/panels/lovelace/common/template-resolver";

// Capture every subscribeRenderTemplate call so the test can drive results.
const { captured, unsubSpy } = vi.hoisted(() => ({
  captured: [] as {
    cb: (result: any) => void;
    params: { template: string; variables?: any; report_errors?: boolean };
  }[],
  unsubSpy: vi.fn(),
}));

vi.mock("../../../../src/data/ws-templates", () => ({
  subscribeRenderTemplate: vi.fn((_conn, cb, params) => {
    captured.push({ cb, params });
    return Promise.resolve(unsubSpy);
  }),
}));

const fakeHost = () => ({ addController: () => undefined }) as any;
const fakeHass = () => ({ connection: {}, user: { name: "Paul" } }) as any;

const emit = (template: string, result: unknown) => {
  captured
    .filter((c) => c.params.template === template)
    .forEach((c) => c.cb({ result, listeners: {} }));
};

describe("TemplateResolver", () => {
  beforeEach(() => {
    captured.length = 0;
    unsubSpy.mockClear();
  });

  it("is a zero-cost pass-through when there are no templates", () => {
    const onChange = vi.fn();
    const r = new TemplateResolver(fakeHost(), onChange);
    r.hostConnected();
    const config = { type: "tile", entity: "light.a" };
    r.setInput(config, fakeHass(), false);
    expect(r.ready).toBe(true);
    expect(r.resolvedConfig).toBe(config);
    expect(captured).toHaveLength(0);
  });

  it("leaves custom cards untouched (they own their template engine)", () => {
    const r = new TemplateResolver(fakeHost(), vi.fn());
    r.hostConnected();
    const config = { type: "custom:mushroom-template-card", name: "{{ x }}" };
    r.setInput(config, fakeHass(), false);
    expect(r.ready).toBe(true);
    expect(r.resolvedConfig).toBe(config);
    expect(captured).toHaveLength(0);
  });

  it("skips self-rendering cards (markdown renders its own content)", () => {
    const r = new TemplateResolver(fakeHost(), vi.fn());
    r.hostConnected();
    const config = { type: "markdown", content: "{{ states('sensor.x') }}" };
    r.setInput(config, fakeHass(), false);
    expect(r.ready).toBe(true);
    expect(r.resolvedConfig).toBe(config);
    expect(captured).toHaveLength(0);
  });

  it("omits a field that never resolves once the build timeout fires", () => {
    vi.useFakeTimers();
    try {
      const r = new TemplateResolver(fakeHost(), vi.fn());
      r.hostConnected();
      r.setInput(
        { type: "gauge", entity: "sensor.p", max: "{{ broken }}" },
        fakeHass(),
        false
      );
      expect(r.ready).toBe(false);
      vi.advanceTimersByTime(3000);
      expect(r.ready).toBe(true);
      expect("max" in r.resolvedConfig!).toBe(false); // dropped, not raw
      expect(r.resolvedConfig!.entity).toBe("sensor.p");
    } finally {
      vi.useRealTimers();
    }
  });

  it("subscribes, stays not-ready until rendered, then resolves", () => {
    const onChange = vi.fn();
    const r = new TemplateResolver(fakeHost(), onChange);
    r.hostConnected();
    r.setInput(
      { type: "tile", name: "{{ states('sensor.x') }}" },
      fakeHass(),
      false
    );
    // one subscription, not ready yet
    expect(captured).toHaveLength(1);
    expect(r.ready).toBe(false);

    emit("{{ states('sensor.x') }}", "Living room");
    expect(r.ready).toBe(true);
    expect(r.resolvedConfig!.name).toBe("Living room");
  });

  it("passes config + user as template variables", () => {
    const r = new TemplateResolver(fakeHost(), vi.fn());
    r.hostConnected();
    const config = { type: "tile", name: "{{ user }}" };
    r.setInput(config, fakeHass(), false);
    expect(captured[0].params.variables).toEqual({
      config,
      user: "Paul",
    });
  });

  it("dedupes identical template sources into a single subscription", () => {
    const r = new TemplateResolver(fakeHost(), vi.fn());
    r.hostConnected();
    r.setInput(
      { type: "tile", name: "{{ x }}", icon: "{{ x }}", state: "{{ y }}" },
      fakeHass(),
      false
    );
    // "{{ x }}" appears twice but is subscribed once; "{{ y }}" once => 2 total
    expect(captured).toHaveLength(2);

    emit("{{ x }}", "shared");
    emit("{{ y }}", "other");
    expect(r.resolvedConfig!.name).toBe("shared");
    expect(r.resolvedConfig!.icon).toBe("shared");
    expect(r.resolvedConfig!.state).toBe("other");
  });

  it("preserves native (non-string) rendered types", () => {
    const r = new TemplateResolver(fakeHost(), vi.fn());
    r.hostConnected();
    r.setInput(
      { type: "gauge", entity: "sensor.p", min: "{{ 0 }}", max: "{{ 100 }}" },
      fakeHass(),
      false
    );
    emit("{{ 0 }}", 0);
    emit("{{ 100 }}", 100);
    expect(r.resolvedConfig!.min).toBe(0);
    expect(r.resolvedConfig!.max).toBe(100);
    expect(typeof r.resolvedConfig!.min).toBe("number");
  });

  it("sets report_errors only in preview mode", () => {
    const live = new TemplateResolver(fakeHost(), vi.fn());
    live.hostConnected();
    live.setInput({ type: "tile", name: "{{ x }}" }, fakeHass(), false);
    expect(captured[0].params.report_errors).toBe(false);

    captured.length = 0;
    const preview = new TemplateResolver(fakeHost(), vi.fn());
    preview.hostConnected();
    preview.setInput({ type: "tile", name: "{{ x }}" }, fakeHass(), true);
    expect(captured[0].params.report_errors).toBe(true);
  });

  it("ignores stale results from a superseded config (stale-result guard)", () => {
    const r = new TemplateResolver(fakeHost(), vi.fn());
    r.hostConnected();

    r.setInput({ type: "tile", name: "{{ old }}" }, fakeHass(), false);
    const staleCb = captured[0].cb;

    // Config changes before the first render arrives -> new generation.
    r.setInput({ type: "tile", name: "{{ new }}" }, fakeHass(), false);
    emit("{{ new }}", "fresh");
    expect(r.resolvedConfig!.name).toBe("fresh");

    // A late result from the superseded subscription must be ignored.
    staleCb({ result: "stale", listeners: {} });
    expect(r.resolvedConfig!.name).toBe("fresh");
  });

  it("unsubscribes on host disconnect", () => {
    const r = new TemplateResolver(fakeHost(), vi.fn());
    r.hostConnected();
    r.setInput({ type: "tile", name: "{{ x }}" }, fakeHass(), false);
    r.hostDisconnected();
    return Promise.resolve().then(() => {
      expect(unsubSpy).toHaveBeenCalled();
    });
  });

  it("does not recompute on a pure hass change (no setConfig churn)", () => {
    const onChange = vi.fn();
    const r = new TemplateResolver(fakeHost(), onChange);
    r.hostConnected();
    const hass = fakeHass();
    r.setInput({ type: "tile", name: "{{ x }}" }, hass, false);
    emit("{{ x }}", "value");
    onChange.mockClear();

    // Same config, new hass reference (a state tick): must not recompute.
    r.setInput({ type: "tile", name: "{{ x }}" }, hass, false);
    // config identity changed here (new object) -> that DOES recompute, so use
    // the SAME config object to isolate the hass-only path:
    onChange.mockClear();
    const config = { type: "tile", name: "{{ x }}" };
    r.setInput(config, hass, false);
    onChange.mockClear();
    r.setInput(config, { ...hass } as any, false);
    expect(onChange).not.toHaveBeenCalled();
  });
});
