import type {
  ReactiveController,
  ReactiveControllerHost,
} from "@lit/reactive-element/reactive-controller";
import type { LitElement } from "lit";
import type { Ref } from "lit/directives/ref";

const scrollParent = (element: Element): HTMLElement | undefined => {
  let node = element.parentElement;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") {
      return node;
    }
    node = node.parentElement;
  }
  return undefined;
};

/**
 * Does what CSS scroll anchoring does in Chrome and Firefox but not in Safari.
 * Point the ref at the element that grows, not at the scroller. Turns native
 * anchoring off on that scroller, so growth elsewhere in it is no longer
 * compensated either.
 */
export class PreserveScrollPositionController implements ReactiveController {
  private _target: Ref<HTMLElement>;

  private _element?: HTMLElement;

  private _scroller?: HTMLElement;

  private _observer?: ResizeObserver;

  private _height = 0;

  constructor(
    host: ReactiveControllerHost & LitElement,
    target: Ref<HTMLElement>
  ) {
    this._target = target;
    host.addController(this);
  }

  hostConnected() {
    this._sync();
  }

  hostUpdated() {
    this._sync();
  }

  hostDisconnected() {
    this._detach();
  }

  private _sync() {
    const element = this._target.value;

    if (element === this._element) {
      return;
    }

    this._detach();
    this._element = element;

    if (element) {
      this._height = element.getBoundingClientRect().height;
      this._observer = new ResizeObserver((entries) =>
        this._compensate(entries)
      );
      this._observer.observe(element);
    }
  }

  private _detach() {
    this._observer?.disconnect();
    this._observer = undefined;
    this._element = undefined;
    if (this._scroller) {
      this._scroller.style.removeProperty("overflow-anchor");
      this._scroller = undefined;
    }
  }

  private _resolveScroller(): HTMLElement | undefined {
    if (!this._scroller && this._element) {
      this._scroller = scrollParent(this._element);
      if (this._scroller) {
        // Chrome and Firefox would otherwise anchor on top of this controller
        // and correct twice.
        this._scroller.style.overflowAnchor = "none";
      }
    }
    return this._scroller;
  }

  private _compensate(entries: ResizeObserverEntry[]) {
    const element = this._element;
    if (!element) {
      return;
    }

    const height =
      entries[0]?.borderBoxSize?.[0]?.blockSize ?? element.offsetHeight;
    const delta = height - this._height;
    this._height = height;
    if (!delta) {
      return;
    }

    const scroller = this._resolveScroller();
    if (
      scroller &&
      element.getBoundingClientRect().top < scroller.getBoundingClientRect().top
    ) {
      scroller.scrollTop += delta;
    }
  }
}
