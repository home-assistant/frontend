import type { ReactiveController, ReactiveControllerHost } from "lit";

export interface VisibiltyObservableElement {
  onVisibilityChanged(): void;
}

export class VisibilityController implements ReactiveController {
  host: ReactiveControllerHost & HTMLElement & VisibiltyObservableElement;

  isVisible = false;

  private observer?: IntersectionObserver;

  constructor(
    host: ReactiveControllerHost & HTMLElement & VisibiltyObservableElement
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
