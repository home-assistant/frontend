import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../panels/lovelace/editor/card-editor/ha-grid-layout-slider";
import "./ha-icon-button";

import { mdiRestore } from "@mdi/js";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../common/dom/fire_event";
import { conditionalClamp } from "../common/number/clamp";
import {
  CardGridSize,
  DEFAULT_GRID_SIZE,
} from "../panels/lovelace/common/compute-card-grid-size";
import { HomeAssistant } from "../types";

@customElement("ha-grid-size-picker")
export class HaGridSizeEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: CardGridSize;

  @property({ attribute: false }) public rows = 8;

  @property({ attribute: false }) public columns = 4;

  @property({ attribute: false }) public rowMin?: number;

  @property({ attribute: false }) public rowMax?: number;

  @property({ attribute: false }) public columnMin?: number;

  @property({ attribute: false }) public columnMax?: number;

  @property({ attribute: false }) public isDefault?: boolean;

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
    const columnMin = this.columnMin ?? 1;
    const columnMax = this.columnMax ?? this.columns;
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
          .value=${fullWidth ? this.columns : columnValue}
          @value-changed=${this._valueChanged}
          @slider-moved=${this._sliderMoved}
          .disabled=${disabledColumns}
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
          .value=${rowValue}
          @value-changed=${this._valueChanged}
          @slider-moved=${this._sliderMoved}
          .disabled=${disabledRows}
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
        <div
          class="preview ${classMap({ "full-width": fullWidth })}"
          style=${styleMap({
            "--total-rows": this.rows,
            "--total-columns": this.columns,
            "--rows": rowValue,
            "--columns": fullWidth ? this.columns : columnValue,
          })}
        >
          <div>
            ${Array(this.rows * this.columns)
              .fill(0)
              .map((_, index) => {
                const row = Math.floor(index / this.columns) + 1;
                const column = (index % this.columns) + 1;
                return html`
                  <div
                    class="cell"
                    data-row=${row}
                    data-column=${column}
                    @click=${this._cellClick}
                  ></div>
                `;
              })}
          </div>
          <div class="selected">
            <div class="cell"></div>
          </div>
        </div>
      </div>
    `;
  }

  _cellClick(ev) {
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
        gap: 8px;
      }
      #columns {
        grid-area: column-slider;
      }
      #rows {
        grid-area: row-slider;
      }
      .reset {
        grid-area: reset;
      }
      .preview {
        position: relative;
        grid-area: preview;
      }
      .preview > div {
        position: relative;
        display: grid;
        grid-template-columns: repeat(var(--total-columns), 1fr);
        grid-template-rows: repeat(var(--total-rows), 25px);
        gap: 4px;
      }
      .preview .cell {
        background-color: var(--disabled-color);
        grid-column: span 1;
        grid-row: span 1;
        border-radius: 4px;
        opacity: 0.2;
        cursor: pointer;
      }
      .preview .selected {
        position: absolute;
        pointer-events: none;
        top: 0;
        left: 0;
        height: 100%;
        width: 100%;
      }
      .selected .cell {
        background-color: var(--primary-color);
        grid-column: 1 / span min(var(--columns, 0), var(--total-columns));
        grid-row: 1 / span min(var(--rows, 0), var(--total-rows));
        opacity: 0.5;
      }
      .preview.full-width .selected .cell {
        grid-column: 1 / -1;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-grid-size-picker": HaGridSizeEditor;
  }
}
