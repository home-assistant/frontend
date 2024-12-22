import { CSSResultGroup, LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import { ensureArray } from "../../common/array/ensure-array";
import { fireEvent } from "../../common/dom/fire_event";
import { LabelSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "../ha-labels-picker";

@customElement("ha-selector-label")
export class HaLabelSelector extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property() public value?: string | string[];

  @property() public name?: string;

  @property() public label?: string;

  @property() public placeholder?: string;

  @property() public helper?: string;

  @property({ attribute: false }) public selector!: LabelSelector;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected render() {
    if (this.selector.label.multiple) {
      return html`
        <ha-labels-picker
          no-add
          .hass=${this.hass}
          .value=${ensureArray(this.value ?? [])}
          .disabled=${this.disabled}
          .label=${this.label}
          @value-changed=${this._handleChange}
        >
        </ha-labels-picker>
      `;
    }
    return html`
      <ha-label-picker
        no-add
        .hass=${this.hass}
        .value=${this.value}
        .disabled=${this.disabled}
        .label=${this.label}
        @value-changed=${this._handleChange}
      >
      </ha-label-picker>
    `;
  }

  private _handleChange(ev) {
    let value = ev.detail.value;
    if (this.value === value) {
      return;
    }
    if (
      (value === "" || (Array.isArray(value) && value.length === 0)) &&
      !this.required
    ) {
      value = undefined;
    }

    fireEvent(this, "value-changed", { value });
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-labels-picker {
        display: block;
        width: 100%;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-label": HaLabelSelector;
  }
}
