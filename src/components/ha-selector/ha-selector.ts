import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { dynamicElement } from "../../common/dom/dynamic-element-directive";
import { Selector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "./ha-selector-action";
import "./ha-selector-addon";
import "./ha-selector-area";
import "./ha-selector-attribute";
import "./ha-selector-boolean";
import "./ha-selector-device";
import "./ha-selector-duration";
import "./ha-selector-entity";
import "./ha-selector-number";
import "./ha-selector-object";
import "./ha-selector-select";
import "./ha-selector-target";
import "./ha-selector-text";
import "./ha-selector-time";
import "./ha-selector-icon";
import "./ha-selector-media";

@customElement("ha-selector")
export class HaSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: Selector;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property() public placeholder?: any;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  public focus() {
    this.shadowRoot?.getElementById("selector")?.focus();
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
        required: this.required,
        helper: this.helper,
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
