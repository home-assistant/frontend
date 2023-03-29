import { html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import memoizeOne from "memoize-one";
import { dynamicElement } from "../../common/dom/dynamic-element-directive";
import {
  Selector,
  handleLegacyEntitySelector,
  handleLegacyDeviceSelector,
} from "../../data/selector";
import type { HomeAssistant } from "../../types";

const LOAD_ELEMENTS = {
  action: () => import("./ha-selector-action"),
  addon: () => import("./ha-selector-addon"),
  area: () => import("./ha-selector-area"),
  attribute: () => import("./ha-selector-attribute"),
  boolean: () => import("./ha-selector-boolean"),
  color_rgb: () => import("./ha-selector-color-rgb"),
  config_entry: () => import("./ha-selector-config-entry"),
  constant: () => import("./ha-selector-constant"),
  date: () => import("./ha-selector-date"),
  datetime: () => import("./ha-selector-datetime"),
  device: () => import("./ha-selector-device"),
  duration: () => import("./ha-selector-duration"),
  entity: () => import("./ha-selector-entity"),
  statistic: () => import("./ha-selector-statistic"),
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
  color_temp: () => import("./ha-selector-color-temp"),
  "ui-action": () => import("./ha-selector-ui-action"),
  "ui-color": () => import("./ha-selector-ui-color"),
};

@customElement("ha-selector")
export class HaSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public name?: string;

  @property() public selector!: Selector;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property() public localizeValue?: (key: string) => string;

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

  private _handleLegacySelector = memoizeOne((selector: Selector) => {
    if ("entity" in selector) {
      return handleLegacyEntitySelector(selector);
    }
    if ("device" in selector) {
      return handleLegacyDeviceSelector(selector);
    }
    return selector;
  });

  protected render() {
    return html`
      ${dynamicElement(`ha-selector-${this._type}`, {
        hass: this.hass,
        name: this.name,
        selector: this._handleLegacySelector(this.selector),
        value: this.value,
        label: this.label,
        placeholder: this.placeholder,
        disabled: this.disabled,
        required: this.required,
        helper: this.helper,
        context: this.context,
        localizeValue: this.localizeValue,
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
