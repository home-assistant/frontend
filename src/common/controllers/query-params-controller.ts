import type {
  ReactiveController,
  ReactiveControllerHost,
} from "@lit/reactive-element/reactive-controller";
import { mainWindow } from "../dom/get_main_window";
import { replaceCurrentUrl } from "../navigate";
import { constructUrlCurrentPath } from "../url/construct-url";
import { currentPath } from "../url/current-path";
import {
  updateQueryString,
  type QueryParamConfig,
  type QueryParamValues,
} from "../url/query-params";
import { debounce } from "../util/debounce";

const DEBOUNCE_WAIT = 300;

type QueryParamsHost = ReactiveControllerHost & HTMLElement;

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
 * config's params. The controller only acts while the URL is still the
 * page the host was connected on.
 */
export class QueryParamsController<
  C extends QueryParamConfig,
> implements ReactiveController {
  private _path?: string;

  private _debouncedWrite = debounce(
    (values: QueryParamValues<C>) => this._write(values),
    DEBOUNCE_WAIT
  );

  constructor(
    private _host: QueryParamsHost,
    private _config: C,
    private _options: QueryParamsControllerOptions
  ) {
    this._host.addController(this);
  }

  public hostConnected() {
    this._path = currentPath();
    mainWindow.addEventListener("location-changed", this._navigated);
    mainWindow.addEventListener("popstate", this._navigated);
    // Before the first update the host reads the URL itself, after its
    // initial state is set
    if (this._host.hasUpdated) {
      this._navigated();
    }
  }

  public hostDisconnected() {
    mainWindow.removeEventListener("location-changed", this._navigated);
    mainWindow.removeEventListener("popstate", this._navigated);
    this._debouncedWrite.cancel();
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
    if (debounced) {
      this._debouncedWrite(values);
      return;
    }
    this._debouncedWrite.cancel();
    this._write(values);
  }

  private _isActive(): boolean {
    return this._options.enabled() && currentPath() === this._path;
  }

  private _navigated = () => {
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
