import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../panels/lovelace/editor/card-editor/ha-grid-layout-slider";
import "./ha-icon-button";
import { mdiRestore } from "@mdi/js";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../common/dom/fire_event";
import { conditionalClamp } from "../common/number/clamp";
import type { CardGridSize } from "../panels/lovelace/common/compute-card-grid-size";
import { DEFAULT_GRID_SIZE } from "../panels/lovelace/common/compute-card-grid-size";
import type { HomeAssistant } from "../types";

@customElement("ha-grid-size-picker")
export class HaGridSizeEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: CardGridSize;

  @property({ attribute: false }) public rows = 8;

  @property({ attribute: false }) public columns = 12;

  @property({ attribute: false }) public rowMin?: number;

  @property({ attribute: false }) public rowMax?: number;

  @property({ attribute: false }) public columnMin?: number;

  @property({ attribute: false }) public columnMax?: number;

  @property({ attribute: false }) public isDefault?: boolean;

  @property({ attribute: false }) public step = 1;

  @state() public _localValue?: CardGridSize = { rows: 1, columns: 1 };

  protected willUpdate(changedProperties) {
    if (changedProperties.has("value")) {
      this._localValue = this.value;
    }
  }

  protected render() {
    const disabledColumns =
      this.columnMin !== undefined && this.columnMin === this.columnMax;
    const disabledRows =
      this.rowMin !== undefined && this.rowMin === this.rowMax;

    const autoHeight = this._localValue?.rows === "auto";
    const fullWidth = this._localValue?.columns === "full";

    const rowMin = this.rowMin ?? 1;
    const rowMax = this.rowMax ?? this.rows;
    const columnMin = Math.ceil((this.columnMin ?? 1) / this.step) * this.step;
    const columnMax =
      Math.ceil((this.columnMax ?? this.columns) / this.step) * this.step;
    const rowValue = autoHeight ? rowMin : this._localValue?.rows;
    const columnValue = this._localValue?.columns;

    return html`
      <div class="grid">
        <ha-grid-layout-slider
          aria-label=${this.hass.localize(
            "ui.components.grid-size-picker.columns"
          )}
          id="columns"
          .min=${columnMin}
          .max=${columnMax}
          .range=${this.columns}
          .value=${fullWidth ? this.columns : this.value?.columns}
          .step=${this.step}
          @value-changed=${this._valueChanged}
          @slider-moved=${this._sliderMoved}
          .disabled=${disabledColumns}
          tooltip-mode="always"
        ></ha-grid-layout-slider>

        <ha-grid-layout-slider
          aria-label=${this.hass.localize(
            "ui.components.grid-size-picker.rows"
          )}
          id="rows"
          .min=${rowMin}
          .max=${rowMax}
          .range=${this.rows}
          vertical
          .value=${autoHeight ? rowMin : this.value?.rows}
          @value-changed=${this._valueChanged}
          @slider-moved=${this._sliderMoved}
          .disabled=${disabledRows}
          tooltip-mode="always"
        ></ha-grid-layout-slider>
        ${!this.isDefault
          ? html`
              <ha-icon-button
                @click=${this._reset}
                class="reset"
                .path=${mdiRestore}
                label=${this.hass.localize(
                  "ui.components.grid-size-picker.reset_default"
                )}
                title=${this.hass.localize(
                  "ui.components.grid-size-picker.reset_default"
                )}
              >
              </ha-icon-button>
            `
          : nothing}
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
            class="preview-card"
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
    const currentSize = this.value ?? DEFAULT_GRID_SIZE;
    let value = ev.detail.value as CardGridSize[typeof key];

    if (
      key === "columns" &&
      currentSize.columns === "full" &&
      value === this.columns
    ) {
      value = "full";
    }

    const newSize = {
      ...currentSize,
      [key]: value,
    };
    fireEvent(this, "value-changed", { value: newSize });
  }

  private _reset(ev) {
    ev.stopPropagation();
    fireEvent(this, "value-changed", {
      value: {
        rows: undefined,
        columns: undefined,
      },
    });
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
          "reset column-slider"
          "row-slider preview";
        grid-template-rows: auto auto;
        grid-template-columns: auto 1fr;
        gap: var(--ha-space-2);
      }
      #columns {
        grid-area: column-slider;
      }
      #rows {
        grid-area: row-slider;
      }
      .reset {
        grid-area: reset;
        --mdc-icon-button-size: 36px;
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
        border-radius: 8px;
        height: calc(var(--rows, 1) * 30px);
        width: calc(var(--columns, 1) * 100% / var(--total-columns, 12));
        pointer-events: none;
        transition:
          width ease-in-out 180ms,
          height ease-in-out 180ms;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-grid-size-picker": HaGridSizeEditor;
  }
}
