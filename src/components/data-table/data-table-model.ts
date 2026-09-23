import { ContextProvider, createContext } from "@lit/context";
import type { ReactiveElement, TemplateResult } from "lit";
import type {
  DataTableColumnContainer,
  DataTableRowData,
  SortingDirection,
} from "./ha-data-table";

export interface DataTableOptions {
  state: "loading" | "refreshing" | "ready" | "error";
  error?: string;
  id: string;
  narrow: boolean;
  autoHeight: boolean;
  selectable: boolean;
  selectionMode: boolean;
  selected: string[];
  clickable: boolean;
  appendRow?: TemplateResult;
  loadingText?: string;
  noDataText?: string;
  searchLabel?: string;
  filter: string;
  filters: number;
  hasFilters: boolean;
  showFilters: boolean;
  empty: boolean;
  sortColumn?: string;
  sortDirection: SortingDirection;
  groupColumn?: string;
  groupOrder?: string[];
  collapsedGroups: string[];
  hiddenColumns?: string[];
  columnOrder?: string[];
}

export type DataTableConfig<T = DataTableRowData> =
  Partial<DataTableOptions> & {
    data?: T[];
    columns?: DataTableColumnContainer<T>;
  };

export interface DataTableModel<T = DataTableRowData> extends DataTableOptions {
  data: T[];
  columns: DataTableColumnContainer;
  update: (changes: Partial<DataTableOptions>) => void;
}

export const dataTableModelContext =
  createContext<DataTableModel>("data-table-model");

/** Owns one table's context and publishes immutable snapshots to its consumers. */
export class DataTableController<
  T extends DataTableRowData = DataTableRowData,
> {
  private _provider: ContextProvider<typeof dataTableModelContext>;

  private _config: DataTableConfig<T> = {};

  public value: DataTableModel<T>;

  constructor(
    private _host: ReactiveElement,
    config: DataTableConfig<T> = {}
  ) {
    this.value = {
      state: "ready",
      data: [],
      columns: {},
      id: "id",
      narrow: false,
      autoHeight: false,
      selectable: false,
      selectionMode: true,
      selected: [],
      clickable: false,
      filter: "",
      filters: 0,
      hasFilters: false,
      showFilters: false,
      empty: false,
      sortDirection: null,
      collapsedGroups: [],
      ...config,
      update: (changes) => this.update(changes),
    };
    this._provider = new ContextProvider(_host, {
      context: dataTableModelContext,
      initialValue: this.value,
    });
  }

  /** Apply page inputs during render without resetting unchanged interaction state. */
  public setConfig(config: DataTableConfig<T>) {
    const changes: DataTableConfig<T> = {};
    for (const key of Object.keys(config) as (keyof DataTableConfig<T>)[]) {
      if (!Object.is(config[key], this._config[key])) {
        Object.assign(changes, { [key]: config[key] });
      }
    }
    this._config = config;
    if (Object.keys(changes).length) {
      this.value = { ...this.value, ...changes };
      this._provider.setValue(this.value);
    }
  }

  public update(changes: DataTableConfig<T>) {
    this.value = { ...this.value, ...changes };
    this._provider.setValue(this.value);
    this._host.requestUpdate();
  }
}
