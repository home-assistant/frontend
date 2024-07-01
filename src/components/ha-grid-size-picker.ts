import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "./ha-icon-button";
import "../panels/lovelace/editor/card-editor/ha-grid-layout-slider";

import { mdiRestore } from "@mdi/js";
import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../common/dom/fire_event";
import { HomeAssistant } from "../types";

type GridSizeValue = {
  rows?: number;
  columns?: number;
};

@customElement("ha-grid-size-picker")
export class HaGridSizeEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: GridSizeValue;

  @property({ attribute: false }) public rows = 6;

  @property({ attribute: false }) public columns = 4;

  @property({ attribute: false }) public rowMin?: number;

  @property({ attribute: false }) public rowMax?: number;

  @property({ attribute: false }) public columnMin?: number;

  @property({ attribute: false }) public columnMax?: number;

  @property({ attribute: false }) public isDefault?: boolean;

  @state() public _localValue?: GridSizeValue = undefined;

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
    return html`
      <div class="grid">
        <ha-grid-layout-slider
          aria-label=${this.hass.localize(
            "ui.components.grid-size-picker.columns"
          )}
          id="columns"
          .min=${this.columnMin ?? 1}
          .max=${this.columnMax ?? this.columns}
          .range=${this.columns}
          .value=${this.value?.columns}
          @value-changed=${this._valueChanged}
          @slider-moved=${this._sliderMoved}
          .disabled=${disabledColumns}
        ></ha-grid-layout-slider>
        <ha-grid-layout-slider
          aria-label=${this.hass.localize(
            "ui.components.grid-size-picker.rows"
          )}
          id="rows"
          .min=${this.rowMin ?? 1}
          .max=${this.rowMax ?? this.rows}
          .range=${this.rows}
          vertical
          .value=${this.value?.rows}
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
          class="preview"
          style=${styleMap({
            "--total-rows": this.rows,
            "--total-columns": this.columns,
            "--rows": this._localValue?.rows,
            "--columns": this._localValue?.columns,
          })}
        >
          <div>
            ${Array(this.rows * this.columns)
              .fill(0)
              .map((_, index) => {
                const row = Math.floor(index / this.columns) + 1;
                const column = (index % this.columns) + 1;
                const disabled =
                  (this.rowMin !== undefined && row < this.rowMin) ||
                  (this.rowMax !== undefined && row > this.rowMax) ||
                  (this.columnMin !== undefined && column < this.columnMin) ||
                  (this.columnMax !== undefined && column > this.columnMax);
                return html`
                  <div
                    class="cell"
                    data-row=${row}
                    data-column=${column}
                    ?disabled=${disabled}
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
    if (cell.getAttribute("disabled") !== null) return;
    const rows = Number(cell.getAttribute("data-row"));
    const columns = Number(cell.getAttribute("data-column"));
    fireEvent(this, "value-changed", {
      value: { rows, columns },
    });
  }

  private _valueChanged(ev) {
    ev.stopPropagation();
    const key = ev.currentTarget.id;
    const newValue = {
      ...this.value,
      [key]: ev.detail.value,
    };
    fireEvent(this, "value-changed", { value: newValue });
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
    const key = ev.currentTarget.id;
    const value = ev.detail.value;
    if (value === undefined) return;
    this._localValue = {
      ...this.value,
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
        grid-template-rows: auto 1fr;
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
        aspect-ratio: 1 / 1;
      }
      .preview > div {
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        display: grid;
        grid-template-columns: repeat(var(--total-columns), 1fr);
        grid-template-rows: repeat(var(--total-rows), 1fr);
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
      .preview .cell[disabled] {
        opacity: 0.05;
        cursor: initial;
      }
      .selected {
        pointer-events: none;
      }
      .selected .cell {
        background-color: var(--primary-color);
        grid-column: 1 / span var(--columns, 0);
        grid-row: 1 / span var(--rows, 0);
        opacity: 0.5;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-grid-size-picker": HaGridSizeEditor;
  }
}
