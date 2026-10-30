import type {
  ReactiveController,
  ReactiveControllerHost,
} from "@lit/reactive-element/reactive-controller";
import type { SortingChangedEvent } from "../../components/data-table/ha-data-table";
import { getStorage } from "../decorators/storage";
import type { HASSDomEvent } from "../dom/fire_event";
import type { QueryParamConfig } from "../url/query-params";
import { QueryParamsController } from "./query-params-controller";

export interface DataTableSettingsKeys {
  /** Session storage key for the search. */
  search?: string;
  /** Local storage key for the sorting. */
  sorting?: string;
  /** Local storage key for the grouping. */
  grouping?: string;
}

export interface DataTableSettingsOptions {
  /** The grouping when none is stored. */
  defaultGrouping?: string;
}

/**
 * Keeps the search, sorting and grouping a user picks on a data table page.
 * What a link applies (`link` on the table's events) is shown, but not
 * stored, as links often carry someone else's choices. Bind
 * `searchChanged`, `sortingChanged` and `groupingChanged` to the table's
 * events.
 */
export class DataTableSettingsController implements ReactiveController {
  /** The search shown, which can be a link's. */
  public search: string;

  /** The grouping shown, which can be a link's. */
  public grouping?: string;

  // The search is kept for the session, sorting and grouping for good
  private _sessionStorage = getStorage("sessionStorage");

  private _localStorage = getStorage("localStorage");

  // Only used to know when the page is opened again
  private _queryParams: QueryParamsController<QueryParamConfig>;

  constructor(
    private _host: ReactiveControllerHost,
    private _keys: DataTableSettingsKeys,
    private _options: DataTableSettingsOptions = {}
  ) {
    this._host.addController(this);
    this._queryParams = new QueryParamsController(
      this._host,
      {},
      {
        enabled: () => true,
        navigated: () => this._navigated(),
      }
    );
    this.search = this._storedSearch();
    this.grouping = this._storedGrouping();
  }

  /** The stored sorting, for the table to start with. */
  public get sorting(): SortingChangedEvent | undefined {
    return this._keys.sorting
      ? this._localStorage.getValue<SortingChangedEvent>(this._keys.sorting)
      : undefined;
  }

  /** Show a search, like one a page reads from a link, without storing it. */
  public showSearch(value: string) {
    this.search = value;
    this._host.requestUpdate();
  }

  public searchChanged = (
    ev: HASSDomEvent<HASSDomEvents["search-changed"]>
  ) => {
    this.showSearch(ev.detail.value);

    if (this._keys.search && !ev.detail.link) {
      this._sessionStorage.setValue(this._keys.search, ev.detail.value);
    }
  };

  public sortingChanged = (ev: HASSDomEvent<SortingChangedEvent>) => {
    if (this._keys.sorting && !ev.detail.link) {
      const { column, direction } = ev.detail;
      this._localStorage.setValue(this._keys.sorting, { column, direction });
    }
  };

  public groupingChanged = (
    ev: HASSDomEvent<HASSDomEvents["grouping-changed"]>
  ) => {
    this.grouping = ev.detail.value;
    this._host.requestUpdate();

    if (this._keys.grouping && !ev.detail.link) {
      this._localStorage.setValue(this._keys.grouping, ev.detail.value);
    }
  };

  // A page opened again without params, like from the sidebar, shows what
  // the user stored rather than what a link showed before
  private _navigated() {
    if (this._queryParams.searchParams()?.toString() !== "") {
      return;
    }

    this.search = this._storedSearch();
    this.grouping = this._storedGrouping();
    this._host.requestUpdate();
  }

  private _storedSearch(): string {
    return (
      (this._keys.search
        ? this._sessionStorage.getValue<string>(this._keys.search)
        : undefined) ?? ""
    );
  }

  private _storedGrouping(): string | undefined {
    return (
      (this._keys.grouping
        ? this._localStorage.getValue<string>(this._keys.grouping)
        : undefined) ?? this._options.defaultGrouping
    );
  }
}
