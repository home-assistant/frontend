import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { hex2rgb, rgb2hex } from "../../common/color/convert-color";
import { consumeLocalize } from "../../common/decorators/consume-context-entry";
import { fireEvent } from "../../common/dom/fire_event";
import type { LocalizeFunc } from "../../common/translations/localize";
import type { ColorRGBWSelector } from "../../data/selector";
import "../ha-labeled-slider";
import "../input/ha-input";

@customElement("ha-selector-color_rgbw")
export class HaColorRGBWSelector extends LitElement {
  @property({ attribute: false }) public selector!: ColorRGBWSelector;

  @property({ attribute: false }) public value?: [
    number,
    number,
    number,
    number,
  ];

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  protected render() {
    const [red, green, blue, white] = this.value ?? [0, 0, 0, 0];

    return html`
      <ha-input
        type="color"
        .value=${this.value ? rgb2hex([red, green, blue]) : ""}
        .label=${this.label || ""}
        .required=${this.required}
        .hint=${this.helper}
        .disabled=${this.disabled}
        @change=${this._colorChanged}
      ></ha-input>
      <ha-labeled-slider
        labeled
        .caption=${this._localize("ui.card.light.white_value")}
        .required=${false}
        .disabled=${this.disabled}
        .min=${0}
        .max=${100}
        .value=${Math.round((white * 100) / 255)}
        icon="mdi:file-word-box"
        @value-changed=${this._whiteChanged}
      ></ha-labeled-slider>
    `;
  }

  private _colorChanged(ev: CustomEvent) {
    const [red, green, blue] = hex2rgb((ev.target as any).value);
    fireEvent(this, "value-changed", {
      value: [red, green, blue, this.value?.[3] ?? 0],
    });
  }

  private _whiteChanged(ev: CustomEvent) {
    // The slider fires a plain percentage, which must not reach the form.
    ev.stopPropagation();
    const [red, green, blue] = this.value ?? [0, 0, 0];
    fireEvent(this, "value-changed", {
      value: [red, green, blue, Math.round((ev.detail.value * 255) / 100)],
    });
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-2);
    }
    ha-input {
      min-width: 75px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-color_rgbw": HaColorRGBWSelector;
  }
}
