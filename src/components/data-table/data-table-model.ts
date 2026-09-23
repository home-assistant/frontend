import { ContextProvider, createContext } from "@lit/context";
import type { ReactiveElement } from "lit";
import type { DataTableRowData } from "./ha-data-table";

export interface DataTableModel<T = DataTableRowData> {
  data: T[];
  state: "loading" | "refreshing" | "ready" | "error";
  error?: string;
  loadingText?: string;
  noDataText?: string;
}

export const dataTableModelContext =
  createContext<DataTableModel>("data-table-model");

/** Owns one table's context and publishes immutable snapshots to its consumers. */
export class DataTableController<
  T extends DataTableRowData = DataTableRowData,
> {
  private _provider: ContextProvider<typeof dataTableModelContext>;

  public value: DataTableModel<T>;

  constructor(
    private _host: ReactiveElement,
    config: Partial<DataTableModel<T>> = {}
  ) {
    this.value = {
      state: "ready",
      data: [],
      ...config,
    };
    this._provider = new ContextProvider(_host, {
      context: dataTableModelContext,
      initialValue: this.value,
    });
  }

  public setConfig(config: Partial<DataTableModel<T>>) {
    const value = { ...this.value, ...config };
    if (
      value.data !== this.value.data ||
      value.state !== this.value.state ||
      value.error !== this.value.error ||
      value.loadingText !== this.value.loadingText ||
      value.noDataText !== this.value.noDataText
    ) {
      this.value = value;
      this._provider.setValue(this.value);
    }
  }

  public update(changes: Partial<DataTableModel<T>>) {
    this.setConfig(changes);
    this._host.requestUpdate();
  }
}
