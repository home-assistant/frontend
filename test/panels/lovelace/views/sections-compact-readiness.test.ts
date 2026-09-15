import { afterEach, describe, expect, it, vi } from "vitest";
import { waitForSectionRender } from "../../../../src/panels/lovelace/views/sections-compact-readiness";

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("waitForSectionRender", () => {
  it("waits for a lazy element and the descendants created when it upgrades", async () => {
    const render = deferred();
    const section = document.createElement("div");
    section.append(document.createElement("compact-lazy-readiness-test"));
    document.body.append(section);
    const finished = vi.fn();
    const waiting = waitForSectionRender(
      [section],
      new AbortController().signal
    ).then(finished);
    await Promise.resolve();
    expect(finished).not.toHaveBeenCalled();
    customElements.define(
      "compact-lazy-readiness-test",
      class extends HTMLElement {
        constructor() {
          super();
          const child = document.createElement("div");
          Object.defineProperty(child, "updateComplete", {
            value: render.promise,
          });
          this.attachShadow({ mode: "open" }).append(child);
        }
      }
    );
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 0);
    });
    expect(finished).not.toHaveBeenCalled();
    render.resolve();
    await waiting;
    expect(finished).toHaveBeenCalledTimes(1);
  });
  it("waits for rendered children introduced by an update", async () => {
    const parentRender = deferred();
    const childRender = deferred();
    const section = document.createElement("div");
    const child = document.createElement("div");
    Object.defineProperty(section, "updateComplete", {
      value: parentRender.promise,
    });
    Object.defineProperty(child, "updateComplete", {
      value: childRender.promise,
    });
    const finished = vi.fn();
    const waiting = waitForSectionRender(
      [section],
      new AbortController().signal
    ).then(finished);
    section.append(child);
    parentRender.resolve();
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 0);
    });
    expect(finished).not.toHaveBeenCalled();
    childRender.resolve();
    await waiting;
  });
  it("does not wait for cards in an initially hidden section", async () => {
    const section = document.createElement("div");
    section.hidden = true;
    section.append(document.createElement("compact-hidden-never-defined"));
    await waitForSectionRender([section], new AbortController().signal);
  });
  it("cancels waiting and clears the deadline when the view changes", async () => {
    vi.useFakeTimers();
    const section = document.createElement("compact-aborted-never-defined");
    const controller = new AbortController();
    const waiting = waitForSectionRender([section], controller.signal);
    controller.abort();
    await waiting;
    expect(vi.getTimerCount()).toBe(0);
  });
  it("bounds waiting for a missing custom element", async () => {
    vi.useFakeTimers();
    const section = document.createElement("compact-missing-never-defined");
    const finished = vi.fn();
    const waiting = waitForSectionRender(
      [section],
      new AbortController().signal
    ).then(finished);
    await vi.advanceTimersByTimeAsync(1999);
    expect(finished).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await waiting;
    expect(finished).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
});
