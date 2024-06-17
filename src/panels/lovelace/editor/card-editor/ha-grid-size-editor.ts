import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators";
import "./ha-grid-layout-slider";

import { styleMap } from "lit/directives/style-map";
import { fireEvent } from "../../../../common/dom/fire_event";
import { HomeAssistant } from "../../../../types";

type GridSizeValue = {
  rows?: number;
  columns?: number;
};

@customElement("ha-grid-size-editor")
export class HaGridSizeEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: GridSizeValue;

  @property({ attribute: false }) public rows = 6;

  @property({ attribute: false }) public columns = 4;

  @property({ attribute: false }) public rowMin?: number;

  @property({ attribute: false }) public rowMax?: number;

  @property({ attribute: false }) public columnMin?: number;

  @property({ attribute: false }) public columnMax?: number;

  @state() public _localValue?: GridSizeValue = undefined;

  protected willUpdate(changedProperties) {
    if (changedProperties.has("value")) {
      this._localValue = this.value;
    }
  }

  protected render() {
    return html`
      <div class="grid">
        <ha-grid-layout-slider
          id="columns"
          min="1"
          max="4"
          start="0"
          .end=${this.columns}
          .value=${this.value?.columns ?? 4}
          @value-changed=${this._valueChanged}
          @slider-moved=${this._sliderMoved}
        ></ha-grid-layout-slider>
        <ha-grid-layout-slider
          id="rows"
          min="1"
          max="4"
          start="0"
          vertical
          .end=${this.rows}
          .value=${this.value?.rows}
          @value-changed=${this._valueChanged}
          @slider-moved=${this._sliderMoved}
        ></ha-grid-layout-slider>
        <div
          class="preview"
          style=${styleMap({
            "--total-rows": this.rows,
            "--total-columns": this.columns,
            "--rows": this._localValue?.rows ?? 1,
            "--columns": this._localValue?.columns ?? 4,
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
                    .disabled=${(this.rowMin !== undefined &&
                      row < this.rowMin) ||
                    (this.rowMax !== undefined && row > this.rowMax) ||
                    (this.columnMin !== undefined && column < this.columnMin) ||
                    (this.columnMax !== undefined && column > this.columnMax)}
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
    fireEvent(this, "value-changed", { value: { rows, columns } });
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
          ". column-slider"
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
      .preview .cell:hover {
        opacity: 0.5;
      }
      .selected {
        pointer-events: none;
      }
      .selected .cell {
        background-color: var(--primary-color);
        grid-column: 1 / span var(--columns);
        grid-row: 1 / span var(--rows);
        opacity: 0.5;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-grid-size-editor": HaGridSizeEditor;
  }
}
