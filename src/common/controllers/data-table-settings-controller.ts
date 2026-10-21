import type {
  ReactiveController,
  ReactiveControllerHost,
} from "@lit/reactive-element/reactive-controller";
import type { SortingChangedEvent } from "../../components/data-table/ha-data-table";
import { getStorage, type StorageName } from "../decorators/storage";
import type { HASSDomEvent } from "../dom/fire_event";

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

  constructor(
    private _host: ReactiveControllerHost,
    private _keys: DataTableSettingsKeys,
    options: DataTableSettingsOptions = {}
  ) {
    this._host.addController(this);
    this.search = this._get<string>(this._keys.search, "sessionStorage") ?? "";
    this.grouping =
      this._get<string>(this._keys.grouping) ?? options.defaultGrouping;
  }

  /** The stored sorting, for the table to start with. */
  public get sorting(): SortingChangedEvent | undefined {
    return this._get<SortingChangedEvent>(this._keys.sorting);
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

    if (!ev.detail.link) {
      this._set(this._keys.search, ev.detail.value, "sessionStorage");
    }
  };

  public sortingChanged = (ev: HASSDomEvent<SortingChangedEvent>) => {
    if (!ev.detail.link) {
      const { column, direction } = ev.detail;
      this._set(this._keys.sorting, { column, direction });
    }
  };

  public groupingChanged = (
    ev: HASSDomEvent<HASSDomEvents["grouping-changed"]>
  ) => {
    this.grouping = ev.detail.value;
    this._host.requestUpdate();

    if (!ev.detail.link) {
      this._set(this._keys.grouping, ev.detail.value);
    }
  };

  private _get<T>(
    key: string | undefined,
    storageName?: StorageName
  ): T | undefined {
    if (!key) {
      return undefined;
    }

    const storage = getStorage(storageName);
    storage.addFromStorage(key);

    return storage.getValue<T>(key);
  }

  private _set<T>(
    key: string | undefined,
    value: T,
    storageName?: StorageName
  ) {
    if (key) {
      getStorage(storageName).setValue<T>(key, value);
    }
  }
}
