import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { hex2rgb, rgb2hex } from "../../common/color/convert-color";
import { fireEvent } from "../../common/dom/fire_event";
import type { ColorRGBSelector } from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-textfield";

@customElement("ha-selector-color_rgb")
export class HaColorRGBSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: ColorRGBSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    return html`
      <ha-textfield
        type="color"
        helperPersistent
        .value=${this.value ? rgb2hex(this.value as any) : ""}
        .label=${this.label || ""}
        .required=${this.required}
        .helper=${this.helper}
        .disalbled=${this.disabled}
        @change=${this._valueChanged}
      ></ha-textfield>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    const value = (ev.target as any).value;
    fireEvent(this, "value-changed", {
      value: hex2rgb(value),
    });
  }

  static styles = css`
    :host {
      display: flex;
      justify-content: flex-end;
      align-items: center;
    }
    ha-textfield {
      --text-field-padding: 8px;
      min-width: 75px;
      flex-grow: 1;
      margin: 0 4px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-color_rgb": HaColorRGBSelector;
  }
}
