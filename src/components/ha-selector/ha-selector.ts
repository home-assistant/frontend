import { html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import { dynamicElement } from "../../common/dom/dynamic-element-directive";
import type { Selector } from "../../data/selector";
import type { HomeAssistant } from "../../types";

const LOAD_ELEMENTS = {
  action: () => import("./ha-selector-action"),
  addon: () => import("./ha-selector-addon"),
  area: () => import("./ha-selector-area"),
  attribute: () => import("./ha-selector-attribute"),
  boolean: () => import("./ha-selector-boolean"),
  "color-rgb": () => import("./ha-selector-color-rgb"),
  "config-entry": () => import("./ha-selector-config-entry"),
  date: () => import("./ha-selector-date"),
  datetime: () => import("./ha-selector-datetime"),
  device: () => import("./ha-selector-device"),
  duration: () => import("./ha-selector-duration"),
  entity: () => import("./ha-selector-entity"),
  file: () => import("./ha-selector-file"),
  navigation: () => import("./ha-selector-navigation"),
  number: () => import("./ha-selector-number"),
  object: () => import("./ha-selector-object"),
  select: () => import("./ha-selector-select"),
  state: () => import("./ha-selector-state"),
  target: () => import("./ha-selector-target"),
  template: () => import("./ha-selector-template"),
  text: () => import("./ha-selector-text"),
  time: () => import("./ha-selector-time"),
  icon: () => import("./ha-selector-icon"),
  media: () => import("./ha-selector-media"),
  theme: () => import("./ha-selector-theme"),
  location: () => import("./ha-selector-location"),
  "color-temp": () => import("./ha-selector-color-temp"),
  "ui-action": () => import("./ha-selector-ui-action"),
};

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

  @property() public context?: Record<string, any>;

  public focus() {
    this.shadowRoot?.getElementById("selector")?.focus();
  }

  private get _type() {
    return Object.keys(this.selector)[0];
  }

  protected willUpdate(changedProps: PropertyValues) {
    if (changedProps.has("selector") && this.selector) {
      LOAD_ELEMENTS[this._type]?.();
    }
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
        context: this.context,
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
