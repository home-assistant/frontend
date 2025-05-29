import { customElement, property } from "lit/decorators";
import { css, html, LitElement, nothing } from "lit";
import "./ha-radio";
import { classMap } from "lit/directives/class-map";
import { styleMap } from "lit/directives/style-map";
import type { HaRadio } from "./ha-radio";
import { fireEvent } from "../common/dom/fire_event";
import type { HomeAssistant } from "../types";
import { computeRTL } from "../common/util/compute_rtl";
import { stopPropagation } from "../common/dom/stop_propagation";

interface SelectBoxOptionImage {
  src: string;
  src_dark?: string;
  flip_rtl?: boolean;
}

export interface SelectBoxOption {
  label?: string;
  description?: string;
  image?: string | SelectBoxOptionImage;
  value: string;
  disabled?: boolean;
}

@customElement("ha-select-box")
export class HaSelectBox extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public options: SelectBoxOption[] = [];

  @property({ attribute: false }) public value?: string;

  @property({ type: Boolean }) public disabled?: boolean;

  @property({ type: Number, attribute: "max_columns" })
  public maxColumns?: number;

  render() {
    const maxColumns = this.maxColumns ?? 3;
    const columns = Math.min(maxColumns, this.options.length);

    return html`
      <div class="list" style=${styleMap({ "--columns": columns })}>
        ${this.options.map((option) => this._renderOption(option))}
      </div>
    `;
  }

  private _renderOption(option: SelectBoxOption) {
    const horizontal = this.maxColumns === 1;
    const disabled = option.disabled || this.disabled || false;
    const selected = option.value === this.value;

    const isDark = this.hass?.themes.darkMode || false;
    const isRTL = this.hass ? computeRTL(this.hass) : false;

    const imageSrc =
      typeof option.image === "object"
        ? (isDark && option.image.src_dark) || option.image.src
        : option.image;
    const imageFlip =
      typeof option.image === "object" ? isRTL && option.image.flip_rtl : false;

    return html`
      <label
        class="option ${classMap({
          horizontal: horizontal,
          selected: selected,
        })}"
        ?disabled=${disabled}
        @click=${this._labelClick}
      >
        <div class="content">
          <ha-radio
            .checked=${option.value === this.value}
            .value=${option.value}
            .disabled=${disabled}
            @change=${this._radioChanged}
            @click=${stopPropagation}
          ></ha-radio>
          <div class="text">
            <span class="label">${option.label}</span>
            ${option.description
              ? html`<span class="description">${option.description}</span>`
              : nothing}
          </div>
        </div>
        ${imageSrc
          ? html`
              <img class=${imageFlip ? "flipped" : ""} alt="" src=${imageSrc} />
            `
          : nothing}
      </label>
    `;
  }

  private _labelClick(ev) {
    ev.stopPropagation();
    ev.currentTarget.querySelector("ha-radio")?.click();
  }

  private _radioChanged(ev: CustomEvent) {
    ev.stopPropagation();
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
    .option {
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

    .option .content {
      position: relative;
      display: flex;
      flex-direction: row;
      gap: 8px;
      min-width: 0;
      width: 100%;
    }
    .option .content ha-radio {
      margin: -12px;
      flex: none;
    }
    .option .content .text {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
      flex: 1;
    }
    .option .content .text .label {
      color: var(--primary-text-color);
      font-size: var(--ha-font-size-m);
      font-weight: var(--ha-font-weight-normal);
      line-height: var(--ha-line-height-condensed);
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .option .content .text .description {
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
      font-weight: var(--ha-font-weight-normal);
      line-height: var(--ha-line-height-condensed);
    }
    img {
      position: relative;
      max-width: var(--ha-select-box-image-size, 96px);
      max-height: var(--ha-select-box-image-size, 96px);
      margin: auto;
    }

    .flipped {
      transform: scaleX(-1);
    }

    .option.horizontal {
      flex-direction: row;
      align-items: flex-start;
    }

    .option.horizontal img {
      margin: 0;
    }

    .option:before {
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
    .option:hover:before {
      background-color: var(--divider-color);
    }
    .option.selected:before {
      background-color: var(--primary-color);
    }
    .option[disabled] {
      cursor: not-allowed;
    }
    .option[disabled] .content,
    .option[disabled] img {
      opacity: 0.5;
    }
    .option[disabled]:before {
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
