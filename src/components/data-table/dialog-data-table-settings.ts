import { mdiDrag, mdiEye, mdiEyeOff } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { repeat } from "lit/directives/repeat";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { haStyleDialog } from "../../resources/styles";
import type { HomeAssistant } from "../../types";
import "./ha-button";
import { createCloseHeading } from "../ha-dialog";
import "../ha-list";
import "../ha-list-item";
import "../ha-sortable";
import type {
  DataTableColumnContainer,
  DataTableColumnData,
} from "./ha-data-table";
import type { DataTableSettingsDialogParams } from "./show-dialog-data-table-settings";

@customElement("dialog-data-table-settings")
export class DialogDataTableSettings extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: DataTableSettingsDialogParams;

  @state() private _columnOrder?: string[];

  @state() private _hiddenColumns?: string[];

  public showDialog(params: DataTableSettingsDialogParams) {
    this._params = params;
    this._columnOrder = params.columnOrder;
    this._hiddenColumns = params.hiddenColumns;
  }

  public closeDialog() {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private _sortedColumns = memoizeOne(
    (
      columns: DataTableColumnContainer,
      columnOrder: string[] | undefined,
      hiddenColumns: string[] | undefined
    ) =>
      Object.keys(columns)
        .filter((col) => !columns[col].hidden)
        .sort((a, b) => {
          const orderA = columnOrder?.indexOf(a) ?? -1;
          const orderB = columnOrder?.indexOf(b) ?? -1;
          const hiddenA =
            hiddenColumns?.includes(a) ?? Boolean(columns[a].defaultHidden);
          const hiddenB =
            hiddenColumns?.includes(b) ?? Boolean(columns[b].defaultHidden);
          if (hiddenA !== hiddenB) {
            return hiddenA ? 1 : -1;
          }
          if (orderA !== orderB) {
            if (orderA === -1) {
              return 1;
            }
            if (orderB === -1) {
              return -1;
            }
          }
          return orderA - orderB;
        })
        .reduce(
          (arr, key) => {
            arr.push({ key, ...columns[key] });
            return arr;
          },
          [] as (DataTableColumnData & { key: string })[]
        )
  );

  protected render() {
    if (!this._params) {
      return nothing;
    }

    const localize = this._params.localizeFunc || this.hass.localize;

    const columns = this._sortedColumns(
      this._params.columns,
      this._columnOrder,
      this._hiddenColumns
    );

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          localize("ui.components.data-table.settings.header")
        )}
      >
        <ha-sortable
          @item-moved=${this._columnMoved}
          draggable-selector=".draggable"
          handle-selector=".handle"
        >
          <ha-list>
            ${repeat(
              columns,
              (col) => col.key,
              (col, _idx) => {
                const canMove = !col.main && col.moveable !== false;
                const canHide = !col.main && col.hideable !== false;
                const isVisible = !(this._columnOrder &&
                this._columnOrder.includes(col.key)
                  ? (this._hiddenColumns?.includes(col.key) ??
                    col.defaultHidden)
                  : col.defaultHidden);

                return html`<ha-list-item
                  hasMeta
                  class=${classMap({
                    hidden: !isVisible,
                    draggable: canMove && isVisible,
                  })}
                  graphic="icon"
                  noninteractive
                  >${col.title || col.label || col.key}
                  ${canMove && isVisible
                    ? html`<ha-svg-icon
                        class="handle"
                        .path=${mdiDrag}
                        slot="graphic"
                      ></ha-svg-icon>`
                    : nothing}
                  <ha-icon-button
                    tabindex="0"
                    class="action"
                    .disabled=${!canHide}
                    .hidden=${!isVisible}
                    .path=${isVisible ? mdiEye : mdiEyeOff}
                    slot="meta"
                    .label=${this.hass!.localize(
                      `ui.components.data-table.settings.${isVisible ? "hide" : "show"}`,
                      { title: typeof col.title === "string" ? col.title : "" }
                    )}
                    .column=${col.key}
                    @click=${this._toggle}
                  ></ha-icon-button>
                </ha-list-item>`;
              }
            )}
          </ha-list>
        </ha-sortable>
        <ha-button slot="secondaryAction" @click=${this._reset}
          >${localize("ui.components.data-table.settings.restore")}</ha-button
        >
        <ha-button slot="primaryAction" @click=${this.closeDialog}>
          ${localize("ui.components.data-table.settings.done")}
        </ha-button>
      </ha-dialog>
    `;
  }

  private _columnMoved(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._params) {
      return;
    }
    const { oldIndex, newIndex } = ev.detail;

    const columns = this._sortedColumns(
      this._params.columns,
      this._columnOrder,
      this._hiddenColumns
    );

    const columnOrder = columns.map((column) => column.key);

    const option = columnOrder.splice(oldIndex, 1)[0];
    columnOrder.splice(newIndex, 0, option);

    this._columnOrder = columnOrder;

    this._params!.onUpdate(this._columnOrder, this._hiddenColumns);
  }

  private _toggle(ev) {
    if (!this._params) {
      return;
    }
    const column = ev.target.column;
    const wasHidden = ev.target.hidden;

    const hidden = [
      ...(this._hiddenColumns ??
        Object.entries(this._params.columns)
          .filter(([_key, col]) => col.defaultHidden)
          .map(([key]) => key)),
    ];

    if (wasHidden && hidden.includes(column)) {
      hidden.splice(hidden.indexOf(column), 1);
    } else if (!wasHidden) {
      hidden.push(column);
    }

    const columns = this._sortedColumns(
      this._params.columns,
      this._columnOrder,
      hidden
    );

    if (!this._columnOrder) {
      this._columnOrder = columns.map((col) => col.key);
    } else {
      const newOrder = this._columnOrder.filter((col) => col !== column);

      // Array.findLastIndex when supported or core-js polyfill
      const findLastIndex = (
        arr: any[],
        fn: (item: any, index: number, arr: any[]) => boolean
      ) => {
        for (let i = arr.length - 1; i >= 0; i--) {
          if (fn(arr[i], i, arr)) return i;
        }
        return -1;
      };

      let lastMoveable = findLastIndex(
        newOrder,
        (col) =>
          col !== column &&
          !hidden.includes(col) &&
          !this._params!.columns[col].main &&
          this._params!.columns[col].moveable !== false
      );

      if (lastMoveable === -1) {
        lastMoveable = newOrder.length - 1;
      }

      columns.forEach((col) => {
        if (!newOrder.includes(col.key)) {
          if (col.moveable === false) {
            newOrder.unshift(col.key);
          } else {
            newOrder.splice(lastMoveable + 1, 0, col.key);
          }

          if (
            col.key !== column &&
            col.defaultHidden &&
            !hidden.includes(col.key)
          ) {
            hidden.push(col.key);
          }
        }
      });

      this._columnOrder = newOrder;
    }

    this._hiddenColumns = hidden;

    this._params!.onUpdate(this._columnOrder, this._hiddenColumns);
  }

  private _reset() {
    this._columnOrder = undefined;
    this._hiddenColumns = undefined;

    this._params!.onUpdate(this._columnOrder, this._hiddenColumns);
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --mdc-dialog-max-width: 500px;
          --dialog-z-index: 10;
          --dialog-content-padding: 0 8px;
        }
        @media all and (max-width: 451px) {
          ha-dialog {
            --vertical-align-dialog: flex-start;
            --dialog-surface-margin-top: 250px;
            --ha-dialog-border-radius: 28px 28px 0 0;
            --mdc-dialog-min-height: calc(100% - 250px);
            --mdc-dialog-max-height: calc(100% - 250px);
          }
        }
        ha-list-item {
          --mdc-list-side-padding: 12px;
          overflow: visible;
        }
        .hidden {
          color: var(--disabled-text-color);
        }
        .handle {
          cursor: move; /* fallback if grab cursor is unsupported */
          cursor: grab;
        }
        .actions {
          display: flex;
          flex-direction: row;
        }
        ha-icon-button {
          display: block;
          margin: -12px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-data-table-settings": DialogDataTableSettings;
  }
}
