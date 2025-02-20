import { customElement, property } from "lit/decorators";
import { css, html, LitElement, nothing } from "lit";
import "./ha-radio";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import type { HaRadio } from "./ha-radio";
import { fireEvent } from "../common/dom/fire_event";

export interface SelectBoxOption {
  primary?: string;
  secondary?: string;
  image?: string;
  value: string;
  disabled?: boolean;
}

@customElement("ha-select-box")
export class HaSelectBox extends LitElement {
  @property({ attribute: false }) public options: SelectBoxOption[] = [];

  @property({ attribute: false }) public value?: string;

  @property({ type: Boolean }) public disabled?: boolean;

  @property({ type: String })
  public orientation: "vertical" | "horizontal" = "vertical";

  @property({ type: Number, attribute: "max_columns" })
  public maxColumns = 3;

  render() {
    const optionsCount = this.options.length;

    return html`
      <div
        class="list"
        style=${styleMap({
          "--columns": Math.min(this.maxColumns, optionsCount),
        })}
      >
        ${this.options.map((item) => this._renderItem(item))}
      </div>
    `;
  }

  private _renderItem(item: SelectBoxOption) {
    const disabled = item.disabled || this.disabled || false;
    const selected = item.value === this.value;
    return html`
      <label
        class="item ${classMap({
          horizontal: this.orientation === "horizontal",
          selected: selected,
        })}"
        ?disabled=${disabled}
        @click=${this._labelClick}
      >
        <div class="content">
          <ha-radio
            .checked=${item.value === this.value}
            .value=${item.value}
            .disabled=${disabled}
            @change=${this._radioChanged}
          ></ha-radio>
          <div class="label">
            <span class="primary">${item.primary}</span>
            ${item.secondary
              ? html`<span class="secondary">${item.secondary}</span>`
              : nothing}
          </div>
        </div>
        ${item.image ? html`<img alt="" src=${item.image} />` : nothing}
      </label>
    `;
  }

  private _labelClick(ev) {
    ev.stopPropagation();
    ev.currentTarget.querySelector("ha-radio")?.click();
  }

  private _radioChanged(ev: CustomEvent) {
    const radio = ev.currentTarget as HaRadio;
    const value = radio.value;
    if (this.disabled || value === undefined || value === (this.value ?? "")) {
      return;
    }
    fireEvent(this, "value-changed", {
      value: value,
    });
  }

  static styles = css`
    .list {
      display: grid;
      grid-template-columns: repeat(var(--columns, 1), minmax(0, 1fr));
      gap: 12px;
    }
    .item {
      position: relative;
      display: block;
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      gap: 8px;
      overflow: hidden;
      cursor: pointer;
    }

    .item .content {
      position: relative;
      display: flex;
      flex-direction: row;
      gap: 8px;
      min-width: 0;
      width: 100%;
    }
    .item .content ha-radio {
      margin: -12px;
      flex: none;
    }
    .item .content .label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
      flex: 1;
    }
    .item .content .label .primary {
      color: var(--primary-text-color);
      font-size: 14px;
      font-weight: 400;
      line-height: 20px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .item .content .label .secondary {
      color: var(--secondary-text-color);
      font-size: 13px;
      font-weight: 400;
      line-height: 16px;
    }
    img {
      position: relative;
      max-width: var(--ha-select-box-image-size, 96px);
      max-height: var(--ha-select-box-image-size, 96px);
      margin: auto;
    }

    .item.horizontal {
      flex-direction: row;
      align-items: flex-start;
    }

    .item.horizontal img {
      margin: 0;
    }

    .item:before {
      content: "";
      display: block;
      inset: 0;
      position: absolute;
      background-color: transparent;
      pointer-events: none;
      opacity: 0.2;
      transition:
        background-color 180ms ease-in-out,
        opacity 180ms ease-in-out;
    }
    .item:hover:before {
      background-color: var(--divider-color);
    }
    .item.selected:before {
      background-color: var(--primary-color);
    }
    .item[disabled] {
      cursor: not-allowed;
    }
    .item[disabled] .content,
    .item[disabled] img {
      opacity: 0.5;
    }
    .item[disabled]:before {
      background-color: var(--disabled-color);
      opacity: 0.05;
    }
  `;
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-select-box": HaSelectBox;
  }
}
