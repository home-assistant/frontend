import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { hex2rgb, rgb2hex } from "../../common/color/convert-color";
import { fireEvent } from "../../common/dom/fire_event";
import type { ColorRGBSelector } from "../../data/selector";
import "../input/ha-input";

@customElement("ha-selector-color_rgb")
export class HaColorRGBSelector extends LitElement {
  @property({ attribute: false }) public selector!: ColorRGBSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    return html`
      <ha-input
        type="color"
        .value=${this.value ? rgb2hex(this.value as any) : ""}
        .label=${this.label || ""}
        .required=${this.required}
        .hint=${this.helper}
        .disabled=${this.disabled}
        @change=${this._valueChanged}
      ></ha-input>
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
    ha-input {
      min-width: 75px;
      flex-grow: 1;
      margin: 0 var(--ha-space-1);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-color_rgb": HaColorRGBSelector;
  }
}
