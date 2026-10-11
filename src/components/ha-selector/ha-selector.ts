import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import memoizeOne from "memoize-one";
import { dynamicElement } from "../../common/dom/dynamic-element-directive";
import type { Selector, SelectorType } from "../../data/selector";
import {
  handleLegacyDeviceSelector,
  handleLegacyEntitySelector,
} from "../../data/selector";
import type { HomeAssistant } from "../../types";
import "../ha-markdown";

const LOAD_ELEMENTS = {
  action: () => import("./ha-selector-action"),
  addon: () => import("./ha-selector-addon"),
  automation_behavior: () => import("./ha-selector-automation-behavior"),
  app: () => import("./ha-selector-app"),
  area: () => import("./ha-selector-area"),
  areas_display: () => import("./ha-selector-areas-display"),
  attribute: () => import("./ha-selector-attribute"),
  assist_pipeline: () => import("./ha-selector-assist-pipeline"),
  boolean: () => import("./ha-selector-boolean"),
  choose: () => import("./ha-selector-choose"),
  color_rgb: () => import("./ha-selector-color-rgb"),
  condition: () => import("./ha-selector-condition"),
  config_entry: () => import("./ha-selector-config-entry"),
  conversation_agent: () => import("./ha-selector-conversation-agent"),
  constant: () => import("./ha-selector-constant"),
  country: () => import("./ha-selector-country"),
  date: () => import("./ha-selector-date"),
  datetime: () => import("./ha-selector-datetime"),
  device: () => import("./ha-selector-device"),
  device_class: () => import("./ha-selector-device-class"),
  duration: () => import("./ha-selector-duration"),
  entity: () => import("./ha-selector-entity"),
  entity_name: () => import("./ha-selector-entity-name"),
  statistic: () => import("./ha-selector-statistic"),
  file: () => import("./ha-selector-file"),
  floor: () => import("./ha-selector-floor"),
  label: () => import("./ha-selector-label"),
  language: () => import("./ha-selector-language"),
  navigation: () => import("./ha-selector-navigation"),
  number: () => import("./ha-selector-number"),
  numeric_threshold: () => import("./ha-selector-numeric-threshold"),
  object: () => import("./ha-selector-object"),
  period: () => import("./ha-selector-period"),
  qr_code: () => import("./ha-selector-qr-code"),
  select: () => import("./ha-selector-select"),
  selector: () => import("./ha-selector-selector"),
  serial_port: () => import("./ha-selector-serial-port"),
  state: () => import("./ha-selector-state"),
  state_class: () => import("./ha-selector-state-class"),
  backup_location: () => import("./ha-selector-backup-location"),
  stt: () => import("./ha-selector-stt"),
  target: () => import("./ha-selector-target"),
  template: () => import("./ha-selector-template"),
  text: () => import("./ha-selector-text"),
  time: () => import("./ha-selector-time"),
  icon: () => import("./ha-selector-icon"),
  media: () => import("./ha-selector-media"),
  theme: () => import("./ha-selector-theme"),
  timezone: () => import("./ha-selector-timezone"),
  button_toggle: () => import("./ha-selector-button-toggle"),
  trigger: () => import("./ha-selector-trigger"),
  tts: () => import("./ha-selector-tts"),
  tts_voice: () => import("./ha-selector-tts-voice"),
  location: () => import("./ha-selector-location"),
  color_temp: () => import("./ha-selector-color-temp"),
  ui_action: () => import("./ha-selector-ui-action"),
  ui_clock_date_format: () => import("./ha-selector-ui-clock-date-format"),
  ui_color: () => import("./ha-selector-ui-color"),
  ui_state_content: () => import("./ha-selector-ui-state-content"),
  ui_time_format: () => import("./ha-selector-ui-time-format"),
  unit_of_measurement: () => import("./ha-selector-unit-of-measurement"),
} satisfies Record<SelectorType, () => Promise<unknown>>;

const LEGACY_UI_SELECTORS = new Set(["ui-action", "ui-color"]);

// Selector components that render their own helper text, including the
// Markdown variant. ha-selector passes `helper` and `markdownHelpers` through
// untouched and leaves the placement to them. The object fields list
// intentionally omits the option-level helper, so its rendering stays
// entirely bespoke.
const SELF_MANAGED_HELPER_SELECTORS = new Set([
  "object",
  "text",
  "number",
  "boolean",
]);

@customElement("ha-selector")
export class HaSelector extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property() public name?: string;

  @property({ attribute: false }) public selector!: Selector;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @property({ attribute: false })
  public localizeValue?: (key: string) => string;

  @property() public placeholder?: any;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  @property({ attribute: "markdown-helpers", type: Boolean })
  public markdownHelpers = false;

  @property({ attribute: false }) public context?: Record<string, any>;

  @query("#selector", true) private _selectorElement?: HTMLElement;

  public reportValidity(): boolean {
    if (
      this._selectorElement &&
      "reportValidity" in this._selectorElement &&
      typeof this._selectorElement.reportValidity === "function"
    ) {
      return this._selectorElement?.reportValidity() ?? true;
    }
    if (this.required) {
      return (
        this.value !== undefined && this.value !== null && this.value !== ""
      );
    }
    return true;
  }

  public async focus() {
    await this.updateComplete;
    this._selectorElement?.focus();
  }

  private get _type() {
    const type = Object.keys(this.selector)[0];
    if (LEGACY_UI_SELECTORS.has(type)) {
      return type.replace("-", "_");
    }
    return type;
  }

  protected willUpdate(changedProps: PropertyValues<this>) {
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
    const type = Object.keys(this.selector)[0];
    if (LEGACY_UI_SELECTORS.has(type)) {
      return { [type.replace("-", "_")]: selector[type] };
    }
    return selector;
  });

  protected render() {
    const selfManagedHelper = SELF_MANAGED_HELPER_SELECTORS.has(this._type);
    const helper =
      !selfManagedHelper && this.markdownHelpers ? undefined : this.helper;

    return html`
      ${dynamicElement(`ha-selector-${this._type}`, {
        hass: this.hass,
        narrow: this.narrow,
        name: this.name,
        selector: this._handleLegacySelector(this.selector),
        value: this.value,
        label: this.label,
        placeholder: this.placeholder,
        disabled: this.disabled,
        required: this.required,
        helper,
        context: this.context,
        localizeValue: this.localizeValue,
        markdownHelpers: this.markdownHelpers,
        id: "selector",
      })}
      ${
        this.markdownHelpers && !selfManagedHelper && this.helper
          ? html`<ha-markdown
              class="helper"
              .content=${this.helper}
            ></ha-markdown>`
          : nothing
      }
    `;
  }

  static styles = css`
    .helper {
      display: block;
      color: var(--secondary-text-color);
      font-size: var(--ha-font-size-s);
      padding-inline: var(--ha-space-3);
      margin-top: var(--ha-space-2);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector": HaSelector;
  }
}
