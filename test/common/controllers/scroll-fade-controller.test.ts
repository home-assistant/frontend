import type { ReactiveControllerHost } from "@lit/reactive-element/reactive-controller";
import { html, render } from "lit";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScrollFadeController } from "../../../src/common/controllers/scroll-fade-controller";

const SCROLLER_WIDTH = 100;
const CONTENT_WIDTH = 300;
const MAX_SCROLL = CONTENT_WIDTH - SCROLLER_WIDTH;

const observe = vi.fn();

let resizeCallback: () => void;

class MockResizeObserver {
  constructor(callback: () => void) {
    resizeCallback = callback;
  }

  observe = observe;

  unobserve = vi.fn();

  disconnect = vi.fn();
}

const createHost = (): ReactiveControllerHost => ({
  addController: vi.fn(),
  removeController: vi.fn(),
  requestUpdate: vi.fn(),
  updateComplete: Promise.resolve(true),
});

describe("ScrollFadeController", () => {
  let host: ReactiveControllerHost;
  let controller: ScrollFadeController;
  let container: HTMLDivElement;
  let scroller: HTMLDivElement;

  const setLayout = (scrollLeft: number, contentWidth: number) => {
    Object.defineProperties(scroller, {
      scrollLeft: { value: scrollLeft, configurable: true },
      scrollWidth: { value: contentWidth, configurable: true },
      clientWidth: { value: SCROLLER_WIDTH, configurable: true },
    });
  };

  const scrollTo = (scrollLeft: number, contentWidth = CONTENT_WIDTH) => {
    setLayout(scrollLeft, contentWidth);
    scroller.dispatchEvent(new Event("scroll"));
  };

  const fades = () => ({ start: controller.start, end: controller.end });

  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    observe.mockClear();
    host = createHost();
    controller = new ScrollFadeController(host);
    container = document.createElement("div");
    document.body.appendChild(container);
    render(html`<div ${controller.target()}><div></div></div>`, container);
    scroller = container.firstElementChild as HTMLDivElement;
  });

  afterEach(() => {
    container.remove();
    vi.unstubAllGlobals();
  });

  it("does not fade when the content fits", () => {
    scrollTo(0, SCROLLER_WIDTH);
    expect(fades()).toEqual({ start: false, end: false });
  });

  it("fades only the edges that hide content", () => {
    scrollTo(0);
    expect(fades()).toEqual({ start: false, end: true });
    scrollTo(MAX_SCROLL / 2);
    expect(fades()).toEqual({ start: true, end: true });
    scrollTo(MAX_SCROLL);
    expect(fades()).toEqual({ start: true, end: false });
  });

  it("handles the negative scrollLeft of right-to-left layouts", () => {
    scroller.dir = "rtl";
    scrollTo(-MAX_SCROLL / 2);
    expect(fades()).toEqual({ start: true, end: true });
    scrollTo(-MAX_SCROLL);
    expect(fades()).toEqual({ start: true, end: false });
  });

  it("watches the content, which can grow without resizing the scroller", () => {
    expect(observe).toHaveBeenCalledWith(scroller.firstElementChild);
    scrollTo(MAX_SCROLL);
    expect(fades()).toEqual({ start: true, end: false });
    setLayout(MAX_SCROLL, CONTENT_WIDTH + SCROLLER_WIDTH);
    resizeCallback();
    expect(fades()).toEqual({ start: true, end: true });
  });

  it("only requests an update when a fade changes", () => {
    scrollTo(MAX_SCROLL / 4);
    scrollTo(MAX_SCROLL / 2);
    expect(host.requestUpdate).toHaveBeenCalledTimes(1);
  });
});
