/* eslint-disable lit/prefer-static-styles */
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  ReactiveElement,
  TemplateResult,
} from "lit";
import { customElement, property } from "lit/decorators";
import { dynamicElement } from "../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../common/dom/fire_event";
import { HomeAssistant } from "../../types";
import "../ha-alert";
import "../ha-selector/ha-selector";
import { HaFormDataContainer, HaFormElement, HaFormSchema } from "./types";

const LOAD_ELEMENTS = {
  boolean: () => import("./ha-form-boolean"),
  constant: () => import("./ha-form-constant"),
  float: () => import("./ha-form-float"),
  grid: () => import("./ha-form-grid"),
  expandable: () => import("./ha-form-expandable"),
  integer: () => import("./ha-form-integer"),
  multi_select: () => import("./ha-form-multi_select"),
  positive_time_period_dict: () =>
    import("./ha-form-positive_time_period_dict"),
  select: () => import("./ha-form-select"),
  string: () => import("./ha-form-string"),
};

const getValue = (obj, item) =>
  obj ? (!item.name ? obj : obj[item.name]) : null;

const getError = (obj, item) => (obj && item.name ? obj[item.name] : null);

const getWarning = (obj, item) => (obj && item.name ? obj[item.name] : null);

@customElement("ha-form")
export class HaForm extends LitElement implements HaFormElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data!: HaFormDataContainer;

  @property({ attribute: false }) public schema!: readonly HaFormSchema[];

  @property() public error?: Record<string, string>;

  @property() public warning?: Record<string, string>;

  @property({ type: Boolean }) public disabled = false;

  @property() public computeError?: (schema: any, error) => string;

  @property() public computeWarning?: (schema: any, warning) => string;

  @property() public computeLabel?: (
    schema: any,
    data: HaFormDataContainer
  ) => string;

  @property() public computeHelper?: (schema: any) => string | undefined;

  @property() public localizeValue?: (key: string) => string;

  public async focus() {
    await this.updateComplete;
    const root = this.renderRoot.querySelector(".root");
    if (!root) {
      return;
    }
    for (const child of root.children) {
      if (child.tagName !== "HA-ALERT") {
        if (child instanceof ReactiveElement) {
          // eslint-disable-next-line no-await-in-loop
          await child.updateComplete;
        }
        (child as HTMLElement).focus();
        break;
      }
    }
  }

  protected willUpdate(changedProps: PropertyValues) {
    if (changedProps.has("schema") && this.schema) {
      this.schema.forEach((item) => {
        if ("selector" in item) {
          return;
        }
        LOAD_ELEMENTS[item.type]?.();
      });
    }
  }

  protected render(): TemplateResult {
    return html`
      <div class="root" part="root">
        ${this.error && this.error.base
          ? html`
              <ha-alert alert-type="error">
                ${this._computeError(this.error.base, this.schema)}
              </ha-alert>
            `
          : ""}
        ${this.schema.map((item) => {
          const error = getError(this.error, item);
          const warning = getWarning(this.warning, item);

          return html`
            ${error
              ? html`
                  <ha-alert own-margin alert-type="error">
                    ${this._computeError(error, item)}
                  </ha-alert>
                `
              : warning
              ? html`
                  <ha-alert own-margin alert-type="warning">
                    ${this._computeWarning(warning, item)}
                  </ha-alert>
                `
              : ""}
            ${"selector" in item
              ? html`<ha-selector
                  .schema=${item}
                  .hass=${this.hass}
                  .name=${item.name}
                  .selector=${item.selector}
                  .value=${getValue(this.data, item)}
                  .label=${this._computeLabel(item, this.data)}
                  .disabled=${item.disabled || this.disabled || false}
                  .placeholder=${item.required ? "" : item.default}
                  .helper=${this._computeHelper(item)}
                  .localizeValue=${this.localizeValue}
                  .required=${item.required || false}
                  .context=${this._generateContext(item)}
                ></ha-selector>`
              : dynamicElement(this.fieldElementName(item.type), {
                  schema: item,
                  data: getValue(this.data, item),
                  label: this._computeLabel(item, this.data),
                  helper: this._computeHelper(item),
                  disabled: this.disabled || item.disabled || false,
                  hass: this.hass,
                  computeLabel: this.computeLabel,
                  computeHelper: this.computeHelper,
                  context: this._generateContext(item),
                })}
          `;
        })}
      </div>
    `;
  }

  protected fieldElementName(type: string): string {
    return `ha-form-${type}`;
  }

  private _generateContext(
    schema: HaFormSchema
  ): Record<string, any> | undefined {
    if (!schema.context) {
      return undefined;
    }

    const context = {};
    for (const [context_key, data_key] of Object.entries(schema.context)) {
      context[context_key] = this.data[data_key];
    }
    return context;
  }

  protected createRenderRoot() {
    const root = super.createRenderRoot();
    // attach it as soon as possible to make sure we fetch all events.
    this.addValueChangedListener(root);
    return root;
  }

  protected addValueChangedListener(element: Element | ShadowRoot) {
    element.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      const schema = (ev.target as HaFormElement).schema as HaFormSchema;

      if (ev.target === this) return;

      const newValue = !schema.name
        ? ev.detail.value
        : { [schema.name]: ev.detail.value };

      this.data = {
        ...this.data,
        ...newValue,
      };

      fireEvent(this, "value-changed", {
        value: this.data,
      });
    });
  }

  private _computeLabel(schema: HaFormSchema, data: HaFormDataContainer) {
    return this.computeLabel
      ? this.computeLabel(schema, data)
      : schema
      ? schema.name
      : "";
  }

  private _computeHelper(schema: HaFormSchema) {
    return this.computeHelper ? this.computeHelper(schema) : "";
  }

  private _computeError(error, schema: HaFormSchema | readonly HaFormSchema[]) {
    return this.computeError ? this.computeError(error, schema) : error;
  }

  private _computeWarning(
    warning,
    schema: HaFormSchema | readonly HaFormSchema[]
  ) {
    return this.computeWarning ? this.computeWarning(warning, schema) : warning;
  }

  static get styles(): CSSResultGroup {
    return css`
      .root > * {
        display: block;
      }
      .root > *:not([own-margin]):not(:last-child) {
        margin-bottom: 24px;
      }
      ha-alert[own-margin] {
        margin-bottom: 4px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form": HaForm;
  }
}
