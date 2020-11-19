import { customElement, html, LitElement, property } from "lit-element";
import { dynamicElement } from "../../common/dom/dynamic-element-directive";
import { HomeAssistant } from "../../types";

import "./ha-selector-entity";
import "./ha-selector-device";

export type Selector = EntitySelector | DeviceSelector;

export interface EntitySelector {
  entity: {
    integration?: string;
    domain?: string;
  };
}

export interface DeviceSelector {
  device: {
    integration?: string;
    manufacturer?: string;
    model?: string;
  };
}

@customElement("ha-selector")
export class HaSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: Selector;

  @property() public value?: any;

  @property() public label?: string;

  public focus() {
    const input = this.shadowRoot!.getElementById("selector");
    if (!input) {
      return;
    }
    (input as HTMLElement).focus();
  }

  private get _type() {
    return Object.keys(this.selector)[0];
  }

  protected render() {
    return html`
      ${dynamicElement(`ha-selector-${this._type}`, {
        hass: this.hass,
        selector: this.selector,
        value: this.value,
        label: this.label,
        id: "selector",
      })}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector": HaSelector;
  }
}
