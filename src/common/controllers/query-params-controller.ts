import type {
  ReactiveController,
  ReactiveControllerHost,
} from "@lit/reactive-element/reactive-controller";
import type { HASSDomEvent } from "../dom/fire_event";
import { mainWindow } from "../dom/get_main_window";
import { replaceCurrentUrl, type NavigateOptions } from "../navigate";
import { constructUrlCurrentPath } from "../url/construct-url";
import { currentPath } from "../url/current-path";
import {
  updateQueryString,
  type QueryParamConfig,
  type QueryParamValues,
} from "../url/query-params";

const DEBOUNCE_WAIT = 300;

export interface QueryParamsControllerOptions {
  /** Whether the host keeps its state in the URL. */
  enabled: () => boolean;
  /**
   * Called when the page of the host is navigated to while the host is
   * connected, like a second link to an open page or coming back to it. Read
   * the URL with `searchParams()` and apply it, then `write()` the state back.
   */
  navigated: () => void;
}

/**
 * Keeps part of a page's state in the query string of the URL, so it can be
 * shared, bookmarked and reloaded. Writes replace the current history entry,
 * so Back leaves the page instead of undoing each change, and only touch the
 * config's params. The controller only acts while the host is connected and
 * the URL is still the page it was first connected on.
 */
export class QueryParamsController<
  C extends QueryParamConfig,
> implements ReactiveController {
  private _path?: string;

  private _pending?: QueryParamValues<C>;

  private _pendingTimeout?: number;

  private _hostUpdated = false;

  private _connected = false;

  constructor(
    private _host: ReactiveControllerHost,
    private _config: C,
    private _options: QueryParamsControllerOptions
  ) {
    this._host.addController(this);
  }

  public hostConnected() {
    // A cached page is reconnected on the way to another page, before its
    // router has moved on, so it keeps the page it was first connected on
    this._path ??= currentPath();
    this._connected = true;
    mainWindow.addEventListener("location-changed", this._navigated);
    mainWindow.addEventListener("popstate", this._navigated);

    // Before the first update the host reads the URL itself, after its
    // initial state is set
    if (this._hostUpdated) {
      this._navigated();
    }
  }

  public hostUpdated() {
    this._hostUpdated = true;
  }

  public hostDisconnected() {
    // A page that was left can still finish a lookup, while a new page on the
    // same path is showing
    this._connected = false;
    mainWindow.removeEventListener("location-changed", this._navigated);
    mainWindow.removeEventListener("popstate", this._navigated);
    this._cancelPending();
  }

  /** The current search params, or undefined when not on the host's page. */
  public searchParams(): URLSearchParams | undefined {
    if (!this._isActive()) {
      return undefined;
    }
    return new URLSearchParams(mainWindow.location.search);
  }

  /**
   * Write values to the URL. Pass `debounced` for values that change while
   * typing; any later write replaces a pending one.
   */
  public write(values: QueryParamValues<NoInfer<C>>, debounced = false) {
    this._cancelPending();
    if (debounced) {
      this._pending = values;
      this._pendingTimeout = window.setTimeout(
        () => this.flush(),
        DEBOUNCE_WAIT
      );
      return;
    }
    this._write(values);
  }

  /**
   * Write a pending debounced write now, like when typing ends, before
   * something like a dialog adds a history entry it would land on.
   */
  public flush() {
    const values = this._pending;
    this._cancelPending();
    if (values) {
      this._write(values);
    }
  }

  private _cancelPending() {
    clearTimeout(this._pendingTimeout);
    this._pendingTimeout = undefined;
    this._pending = undefined;
  }

  private _isActive(): boolean {
    return (
      this._connected && this._options.enabled() && currentPath() === this._path
    );
  }

  private _navigated = (ev?: Event | HASSDomEvent<NavigateOptions>) => {
    this._cancelPending();
    // A router sends a path without a page, like /config/automation, on to
    // its default page after the host is connected, so it follows that
    const path = currentPath();

    if (
      ev &&
      "detail" in ev &&
      ev.detail?.replace &&
      path.startsWith(`${this._path}/`)
    ) {
      this._path = path;
    }
    // Leaving the page gets here too, before the router swaps the page
    if (this._isActive()) {
      this._options.navigated();
    }
  };

  private _write(values: QueryParamValues<C>) {
    if (!this._isActive()) {
      return;
    }
    const current = mainWindow.location.search;
    const queryString = updateQueryString(current, values, this._config);
    if (current !== (queryString ? `?${queryString}` : "")) {
      replaceCurrentUrl(constructUrlCurrentPath(queryString));
    }
  }
}
