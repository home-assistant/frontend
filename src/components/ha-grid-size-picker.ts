import { mdiGrid, mdiGridLarge } from "@mdi/js";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../common/dom/fire_event";
import { conditionalClamp } from "../common/number/clamp";
import type { CardGridSize } from "../panels/lovelace/common/compute-card-grid-size";
import { DEFAULT_GRID_SIZE } from "../panels/lovelace/common/compute-card-grid-size";
import "../panels/lovelace/editor/card-editor/ha-grid-layout-slider";
import { consumeLocalize } from "../common/decorators/consume-context-entry";
import type { LocalizeFunc } from "../common/translations/localize";
import "./ha-icon-button";

export const GRID_SIZE_PICKER_ROWS = 8;

@customElement("ha-grid-size-picker")
export class HaGridSizeEditor extends LitElement {
  @property({ attribute: false }) public value?: CardGridSize;

  @property({ attribute: false }) public autoRows?: number;

  @property({ attribute: false }) public rows = GRID_SIZE_PICKER_ROWS;

  @property({ attribute: false }) public columns = 12;

  @property({ attribute: false }) public rowMin?: number;

  @property({ attribute: false }) public rowMax?: number;

  @property({ attribute: false }) public columnMin?: number;

  @property({ attribute: false }) public columnMax?: number;

  @property({ attribute: false }) public step = 1;

  @property({ attribute: false }) public precise = false;

  @state() public _localValue?: CardGridSize = { rows: 1, columns: 1 };

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  protected willUpdate(changedProperties: PropertyValues<this>) {
    if (changedProperties.has("value")) {
      this._localValue = this.value;
    }
  }

  private _columnsText(columns: CardGridSize["columns"]): string {
    if (columns === "full") {
      return this._localize("ui.components.grid-size-picker.full_width");
    }
    return this._localize("ui.components.grid-size-picker.columns_value", {
      count: columns,
    });
  }

  private _rowsText(rows: CardGridSize["rows"]): string {
    if (rows === "auto") {
      return this._localize("ui.components.grid-size-picker.fit_content");
    }
    return this._localize("ui.components.grid-size-picker.rows_value", {
      count: rows,
    });
  }

  protected render() {
    const autoHeight = this._localValue?.rows === "auto";
    const fullWidth = this._localValue?.columns === "full";

    const disabledColumns =
      fullWidth ||
      (this.columnMin !== undefined && this.columnMin === this.columnMax);
    const disabledRows =
      autoHeight || (this.rowMin !== undefined && this.rowMin === this.rowMax);

    const rowMin = this.rowMin ?? 1;
    const rowMax = this.rowMax ?? this.rows;
    const columnMin = Math.ceil((this.columnMin ?? 1) / this.step) * this.step;
    const columnMax =
      Math.ceil((this.columnMax ?? this.columns) / this.step) * this.step;
    const autoRows = conditionalClamp(this.autoRows ?? rowMin, rowMin, rowMax);
    const rowValue = autoHeight ? autoRows : this._localValue?.rows;
    const columnValue = this._localValue?.columns;

    return html`
      <div class="grid">
        <ha-icon-button
          class="precise"
          .label=${this._localize(
            this.precise
              ? "ui.components.grid-size-picker.exit_precise_mode"
              : "ui.components.grid-size-picker.enter_precise_mode"
          )}
          .path=${this.precise ? mdiGrid : mdiGridLarge}
          .selected=${this.precise}
          @click=${this._togglePrecise}
        ></ha-icon-button>
        <ha-grid-layout-slider
          aria-label=${this._localize("ui.components.grid-size-picker.columns")}
          id="columns"
          .min=${columnMin}
          .max=${columnMax}
          .range=${this.columns}
          .value=${fullWidth ? this.columns : this.value?.columns}
          .valueText=${
            columnValue !== undefined
              ? this._columnsText(columnValue)
              : undefined
          }
          .step=${this.step}
          @value-changed=${this._valueChanged}
          @slider-moved=${this._sliderMoved}
          .disabled=${disabledColumns}
          tooltip-mode=${disabledColumns ? "never" : "always"}
        ></ha-grid-layout-slider>

        <ha-grid-layout-slider
          aria-label=${this._localize("ui.components.grid-size-picker.rows")}
          id="rows"
          .min=${rowMin}
          .max=${rowMax}
          .range=${this.rows}
          vertical
          .value=${autoHeight ? autoRows : this.value?.rows}
          .valueText=${
            this._localValue?.rows !== undefined
              ? this._rowsText(this._localValue.rows)
              : undefined
          }
          @value-changed=${this._valueChanged}
          @slider-moved=${this._sliderMoved}
          .disabled=${disabledRows}
          tooltip-mode=${disabledRows ? "never" : "always"}
        ></ha-grid-layout-slider>
        <div class="preview">
          <table>
            ${Array(this.rows)
              .fill(0)
              .map((_, index) => {
                const row = index + 1;
                return html`
                  <tr>
                    ${Array(this.columns)
                      .fill(0)
                      .map((__, columnIndex) => {
                        const column = columnIndex + 1;
                        if (
                          column % this.step !== 0 ||
                          (this.columns > 24 && column % 3 !== 0)
                        ) {
                          return nothing;
                        }
                        return html`
                          <td
                            data-row=${row}
                            data-column=${column}
                            @click=${this._cellClick}
                          ></td>
                        `;
                      })}
                  </tr>
                `;
              })}
          </table>
          <div
            class=${classMap({ "preview-card": true, auto: autoHeight })}
            style=${styleMap({
              "--rows": rowValue,
              "--columns": fullWidth ? this.columns : columnValue,
              "--total-columns": this.columns,
            })}
          ></div>
        </div>
      </div>
    `;
  }

  private _togglePrecise() {
    fireEvent(this, "precise-mode-changed", { value: !this.precise });
  }

  private _cellClick(ev) {
    const cell = ev.currentTarget as HTMLElement;
    const rows = Number(cell.getAttribute("data-row"));
    const columns = Number(cell.getAttribute("data-column"));
    const clampedRow: CardGridSize["rows"] = conditionalClamp(
      rows,
      this.rowMin,
      this.rowMax
    );
    let clampedColumn: CardGridSize["columns"] = conditionalClamp(
      columns,
      this.columnMin,
      this.columnMax
    );

    const currentSize = this.value ?? DEFAULT_GRID_SIZE;
    if (currentSize.columns === "full" && clampedColumn === this.columns) {
      clampedColumn = "full";
    }
    fireEvent(this, "value-changed", {
      value: { rows: clampedRow, columns: clampedColumn },
    });
  }

  private _valueChanged(ev) {
    ev.stopPropagation();
    const key = ev.currentTarget.id as "rows" | "columns";
    const value = ev.detail.value as number;
    fireEvent(this, "value-changed", { value: { [key]: value } });
  }

  private _sliderMoved(ev) {
    ev.stopPropagation();
    const key = ev.currentTarget.id as "rows" | "columns";
    const currentSize = this.value ?? DEFAULT_GRID_SIZE;
    const value = ev.detail.value as CardGridSize[typeof key] | undefined;

    if (value === undefined) return;

    this._localValue = {
      ...currentSize,
      [key]: ev.detail.value,
    };
  }

  static styles = [
    css`
      .grid {
        display: grid;
        grid-template-areas:
          "precise column-slider"
          "row-slider preview";
        grid-template-rows: auto auto;
        grid-template-columns: auto 1fr;
        gap: var(--ha-space-2);
      }
      .precise {
        grid-area: precise;
        --ha-icon-button-size: 36px;
      }
      .precise[selected] {
        border-radius: 50%;
        background-color: var(--primary-color);
        color: var(--text-primary-color);
      }
      #columns {
        grid-area: column-slider;
      }
      #rows {
        grid-area: row-slider;
      }
      .preview {
        position: relative;
        grid-area: preview;
      }
      .preview table,
      .preview tr,
      .preview td {
        border: 2px dotted var(--divider-color);
        border-collapse: collapse;
      }
      .preview table {
        width: 100%;
      }
      .preview tr {
        height: 30px;
      }
      .preview td {
        cursor: pointer;
      }
      .preview-card {
        position: absolute;
        top: 0;
        left: 0;
        background-color: var(--primary-color);
        opacity: 0.3;
        border-radius: var(--ha-border-radius-md);
        height: calc(var(--rows, 1) * 30px);
        width: calc(var(--columns, 1) * 100% / var(--total-columns, 12));
        pointer-events: none;
        transition:
          width ease-in-out 180ms,
          height ease-in-out 180ms;
      }
      .preview-card.auto {
        mask-image: linear-gradient(to bottom, black 60%, transparent);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-grid-size-picker": HaGridSizeEditor;
  }
  interface HASSDomEvents {
    "precise-mode-changed": { value: boolean };
  }
}
