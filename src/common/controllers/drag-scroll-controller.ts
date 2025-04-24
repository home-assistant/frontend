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
}

export class DragScrollController implements ReactiveController {
  public mouseIsDown = false;

  public scrolled = false;

  public mouseReleasedAt?: number;

  public scrollStartX = 0;

  public scrollLeft = 0;

  private _host: ReactiveControllerHost & LitElement;

  private _selector: string;

  private _scrollContainer?: HTMLElement | null;

  constructor(
    host: ReactiveControllerHost & LitElement,
    { selector }: DragScrollControllerConfig
  ) {
    this._selector = selector;
    this._host = host;
    host.addController(this);
  }

  hostUpdated() {
    if (this._scrollContainer) {
      return;
    }
    this._scrollContainer = this._host.renderRoot?.querySelector(
      this._selector
    );
    if (this._scrollContainer) {
      this._scrollContainer.addEventListener("mousedown", this._mouseDown);
    }
  }

  hostDisconnected() {
    window.removeEventListener("mousemove", this._mouseMove);
    window.removeEventListener("mouseup", this._mouseUp);
  }

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
    if (this.scrolled) {
      this.mouseReleasedAt = new Date().getTime();
    }
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
    }

    scrollContainer.scrollLeft = this.scrollLeft - scroll;
  };
}
