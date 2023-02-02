import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import { domainIcon } from "../../common/entity/domain_icon";
import { IconSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "../ha-icon-picker";

@customElement("ha-selector-icon")
export class HaIconSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: IconSelector;

  @property() public value?: string;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @property() public context?: {
    icon_entity?: string;
  };

  protected render() {
    const iconEntity = this.context?.icon_entity;

    const stateObj = iconEntity ? this.hass.states[iconEntity] : undefined;

    const placeholder =
      this.selector.icon?.placeholder || stateObj?.attributes.icon;
    const fallbackPath =
      !placeholder && stateObj
        ? domainIcon(computeDomain(iconEntity!), stateObj)
        : undefined;

    return html`
      <ha-icon-picker
        .hass=${this.hass}
        .label=${this.label}
        .value=${this.value}
        .required=${this.required}
        .disabled=${this.disabled}
        .helper=${this.helper}
        .fallbackPath=${this.selector.icon?.fallbackPath ?? fallbackPath}
        .placeholder=${this.selector.icon?.placeholder ?? placeholder}
        @value-changed=${this._valueChanged}
      ></ha-icon-picker>
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
