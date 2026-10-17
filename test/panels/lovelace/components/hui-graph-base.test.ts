import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HuiGraphBase } from "../../../../src/panels/lovelace/components/hui-graph-base";
import "../../../../src/panels/lovelace/components/hui-graph-base";

// Graph producers compute coordinates for the element's size at the moment
// they set them. These tests protect the invariant that the rendered viewBox
// keeps using that size until new coordinates arrive: a resize during the
// morph animation must not draw the line in a viewBox of a different size,
// which crops it (narrower) or leaves it short of the edges (wider).

let frameCallbacks: FrameRequestCallback[] = [];
let now = 0;
let graph: HuiGraphBase | undefined;

const setSize = (el: HTMLElement, width: number, height: number) => {
  Object.defineProperty(el, "clientWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(el, "clientHeight", {
    configurable: true,
    value: height,
  });
};

const runFrame = async (el: HuiGraphBase, time: number) => {
  now = time;
  const callbacks = frameCallbacks;
  frameCallbacks = [];
  callbacks.forEach((callback) => callback(time));
  await el.updateComplete;
};

const viewBox = (el: HuiGraphBase) =>
  el.shadowRoot!.querySelector("svg")!.getAttribute("viewBox");

const firstPoint = (el: HuiGraphBase) => {
  const d = el.shadowRoot!.querySelector("path.line")!.getAttribute("d")!;
  const [, x, y] = /^M (-?[\d.]+),(-?[\d.]+)/.exec(d)!;
  return [Number(x), Number(y)];
};

const mountGraph = async (width: number, height: number) => {
  graph = document.createElement("hui-graph-base");
  setSize(graph, width, height);
  document.body.append(graph);
  await graph.updateComplete;
  return graph;
};

describe("hui-graph-base", () => {
  beforeEach(() => {
    now = 1000;
    frameCallbacks = [];
    vi.spyOn(performance, "now").mockImplementation(() => now);
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
      frameCallbacks.push(callback)
    );
    vi.stubGlobal("cancelAnimationFrame", () => {
      frameCallbacks = [];
    });
    vi.spyOn(window, "getComputedStyle").mockReturnValue({
      getPropertyValue: (name: string) =>
        name === "--ha-animation-duration-slow" ? "350ms" : "",
    } as CSSStyleDeclaration);
  });

  afterEach(() => {
    graph?.remove();
    graph = undefined;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each([
    ["narrower", 200, 40],
    ["wider", 400, 80],
  ])(
    "keeps the viewBox of the coordinates when the element gets %s while animating",
    async (_direction, width, height) => {
      const el = await mountGraph(300, 60);
      el.coordinates = [
        [0, 10],
        [150, 50],
        [300, 30],
      ];
      await el.updateComplete;

      el.coordinates = [
        [0, 50],
        [150, 10],
        [300, 55],
      ];
      await el.updateComplete;

      setSize(el, width, height);
      await runFrame(el, 1100);
      expect(viewBox(el)).toBe("0 0 300 60");

      await runFrame(el, 1400);
      expect(viewBox(el)).toBe("0 0 300 60");
      expect(firstPoint(el)).toEqual([0, 50]);
    }
  );

  it("starts the animation from the current line scaled to the new size", async () => {
    const el = await mountGraph(300, 60);
    el.coordinates = [
      [0, 12],
      [300, 48],
    ];
    await el.updateComplete;

    setSize(el, 200, 40);
    el.coordinates = [
      [0, 30],
      [200, 10],
    ];
    await el.updateComplete;

    expect(viewBox(el)).toBe("0 0 200 40");
    expect(firstPoint(el)[1]).toBeCloseTo(8);

    await runFrame(el, 1100);
    const [, y] = firstPoint(el);
    expect(y).toBeGreaterThan(8.01);
    expect(y).toBeLessThan(30);

    await runFrame(el, 1400);
    expect(firstPoint(el)[1]).toBeCloseTo(30);
  });
});
