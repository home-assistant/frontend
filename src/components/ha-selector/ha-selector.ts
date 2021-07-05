import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { dynamicElement } from "../../common/dom/dynamic-element-directive";
import { Selector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "./ha-selector-action";
import "./ha-selector-addon";
import "./ha-selector-area";
import "./ha-selector-boolean";
import "./ha-selector-device";
import "./ha-selector-entity";
import "./ha-selector-number";
import "./ha-selector-object";
import "./ha-selector-select";
import "./ha-selector-target";
import "./ha-selector-text";
import "./ha-selector-time";

@customElement("ha-selector")
export class HaSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: Selector;

  @property() public value?: any;

  @property() public label?: string;

  @property() public placeholder?: any;

  @property({ type: Boolean }) public disabled = false;

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
        placeholder: this.placeholder,
        disabled: this.disabled,
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
