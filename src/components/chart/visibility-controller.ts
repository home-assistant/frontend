import type { ReactiveController, ReactiveControllerHost } from "lit";

export interface VisibilityObservableElement {
  onVisibilityChanged(): void;
}

export class VisibilityController implements ReactiveController {
  host: ReactiveControllerHost & HTMLElement & VisibilityObservableElement;

  isVisible = false;

  private observer?: IntersectionObserver;

  constructor(
    host: ReactiveControllerHost & HTMLElement & VisibilityObservableElement
  ) {
    this.host = host;
    host.addController(this);
  }

  hostConnected() {
    this.observer = new IntersectionObserver(([entry]) => {
      this.isVisible = entry.isIntersecting;
      this.host.onVisibilityChanged();
    });
    this.observer.observe(this.host);
  }

  hostDisconnected() {
    this.observer?.disconnect();
  }
}
