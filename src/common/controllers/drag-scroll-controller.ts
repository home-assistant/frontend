import type {
  ReactiveController,
  ReactiveControllerHost,
} from "@lit/reactive-element/reactive-controller";
import type { LitElement } from "lit";

/**
 * The config options for a DragScrollController.
 */
export interface DragScrollControllerConfig {
  selector: string;
  enabled?: boolean;
}

export class DragScrollController implements ReactiveController {
  public mouseIsDown = false;

  public scrolled = false;

  public scrolling = false;

  public scrollStartX = 0;

  public scrollLeft = 0;

  public scrolledStart = false;

  public scrolledEnd = false;

  private _host: ReactiveControllerHost & LitElement;

  private _selector: string;

  private _scrollContainer?: HTMLElement | null;

  private _enabled = true;

  public get enabled(): boolean {
    return this._enabled;
  }

  public set enabled(value: boolean) {
    if (value === this._enabled) {
      return;
    }
    this._enabled = value;
    if (this._enabled) {
      this._attach();
    } else {
      this._detach();
    }
    this._host.requestUpdate();
  }

  constructor(
    host: ReactiveControllerHost & LitElement,
    { selector, enabled }: DragScrollControllerConfig
  ) {
    this._selector = selector;
    this._host = host;
    this.enabled = enabled ?? true;
    host.addController(this);
  }

  hostUpdated() {
    if (!this.enabled || this._scrollContainer) {
      return;
    }
    this._attach();
  }

  hostDisconnected() {
    this._detach();
  }

  private _attach() {
    this._scrollContainer = this._host.renderRoot?.querySelector(
      this._selector
    );
    if (this._scrollContainer) {
      this._scrollContainer.addEventListener("mousedown", this._mouseDown);
      this._scrollContainer.addEventListener("scroll", this._onScroll);
      this.scrolledStart = this._scrollContainer.scrollLeft > 0;
      this.scrolledEnd =
        this._scrollContainer.scrollLeft + this._scrollContainer.offsetWidth <
        this._scrollContainer.scrollWidth;
    }
  }

  private _detach() {
    window.removeEventListener("mousemove", this._mouseMove);
    window.removeEventListener("mouseup", this._mouseUp);
    if (this._scrollContainer) {
      this._scrollContainer.removeEventListener("mousedown", this._mouseDown);
      this._scrollContainer.removeEventListener("scroll", this._onScroll);
      this._scrollContainer = undefined;
    }
    this.scrolled = false;
    this.scrolling = false;
    this.mouseIsDown = false;
    this.scrollStartX = 0;
    this.scrollLeft = 0;
  }

  private _onScroll = (event: Event) => {
    const oldScrolledStart = this.scrolledStart;
    const oldScrolledEnd = this.scrolledEnd;

    const container = event.currentTarget as HTMLElement;
    this.scrolledStart = container.scrollLeft > 0;
    this.scrolledEnd =
      container.scrollLeft + container.offsetWidth < container.scrollWidth;
    if (
      this.scrolledStart !== oldScrolledStart ||
      this.scrolledEnd !== oldScrolledEnd
    ) {
      this._host.requestUpdate();
    }
  };

  private _mouseDown = (event: MouseEvent) => {
    const scrollContainer = this._scrollContainer;

    if (!scrollContainer) {
      return;
    }

    this.scrollStartX = event.pageX - scrollContainer.offsetLeft;
    this.scrollLeft = scrollContainer.scrollLeft;
    this.mouseIsDown = true;
    this.scrolled = false;

    window.addEventListener("mousemove", this._mouseMove);
    window.addEventListener("mouseup", this._mouseUp, { once: true });
  };

  private _mouseUp = () => {
    this.mouseIsDown = false;
    this.scrolling = false;
    this._host.requestUpdate();
    window.removeEventListener("mousemove", this._mouseMove);
  };

  private _mouseMove = (event: MouseEvent) => {
    if (!this.mouseIsDown) {
      return;
    }

    const scrollContainer = this._scrollContainer;

    if (!scrollContainer) {
      return;
    }

    const x = event.pageX - scrollContainer.offsetLeft;
    const scroll = x - this.scrollStartX;

    if (!this.scrolled) {
      this.scrolled = Math.abs(scroll) > 1;
      this.scrolling = this.scrolled;
      this._host.requestUpdate();
    }

    scrollContainer.scrollLeft = this.scrollLeft - scroll;
  };
}
