import type { ReactiveController, ReactiveControllerHost } from "lit";
import { fireEvent } from "../../common/dom/fire_event";

/**
 * Tells the nearest `ha-skeleton-overlay` around a component when it starts
 * and stops loading, through `skeleton-loading` events. The component
 * doesn't need to know whether anything wraps it: without an overlay, the
 * events go nowhere.
 *
 * `isLoading` is read after every update of the host.
 */
export class SkeletonLoadingController implements ReactiveController {
  private _host: ReactiveControllerHost & HTMLElement;

  private _isLoading: () => boolean;

  private _loading = false;

  constructor(
    host: ReactiveControllerHost & HTMLElement,
    isLoading: () => boolean
  ) {
    this._host = host;
    this._isLoading = isLoading;
    host.addController(this);
  }

  public hostConnected() {
    // A new overlay may be around it now
    if (this._loading) {
      fireEvent(this._host, "skeleton-loading", { loading: true });
    }
  }

  /**
   * Have the overlay read the skeleton again while loading, for content that
   * redraws itself without changing size, such as a calendar drawing its
   * month after the host has updated.
   */
  public refresh() {
    if (this._loading) {
      fireEvent(this._host, "skeleton-loading", { loading: true });
    }
  }

  public hostUpdated() {
    const loading = this._isLoading();

    if (loading !== this._loading) {
      this._loading = loading;
      fireEvent(this._host, "skeleton-loading", { loading });
    }
  }
}
