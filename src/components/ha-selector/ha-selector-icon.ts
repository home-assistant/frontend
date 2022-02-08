import "../ha-icon-picker";
import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { HomeAssistant } from "../../types";
import { IconSelector } from "../../data/selector";
import { fireEvent } from "../../common/dom/fire_event";

@customElement("ha-selector-icon")
export class HaIconSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: IconSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  protected render() {
    return html`
      <ha-icon-picker
        .label=${this.hass.localize("ui.panel.config.script.editor.icon")}
        .name=${"icon"}
        .value=${this.value}
        @value-changed=${this._valueChanged}
      >
      </ha-icon-picker>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    fireEvent(this, "value-changed", { value: ev.detail.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-icon": HaIconSelector;
  }
}
