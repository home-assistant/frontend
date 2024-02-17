import { html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { until } from "lit/directives/until";
import { fireEvent } from "../../common/dom/fire_event";
import { entityIcon } from "../../data/icons";
import { IconSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "../ha-icon-picker";
import "../ha-state-icon";

@customElement("ha-selector-icon")
export class HaIconSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public selector!: IconSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @property({ attribute: false }) public context?: {
    icon_entity?: string;
  };

  protected render() {
    const iconEntity = this.context?.icon_entity;

    const stateObj = iconEntity ? this.hass.states[iconEntity] : undefined;

    const placeholder =
      this.selector.icon?.placeholder ||
      stateObj?.attributes.icon ||
      (stateObj && until(entityIcon(this.hass, stateObj)));

    return html`
      <ha-icon-picker
        .hass=${this.hass}
        .label=${this.label}
        .value=${this.value}
        .required=${this.required}
        .disabled=${this.disabled}
        .helper=${this.helper}
        .placeholder=${this.selector.icon?.placeholder ?? placeholder}
        @value-changed=${this._valueChanged}
      >
        ${!placeholder && stateObj
          ? html`
              <ha-state-icon
                slot="fallback"
                .hass=${this.hass}
                .stateObj=${stateObj}
              ></ha-state-icon>
            `
          : nothing}
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
