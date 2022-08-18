import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property } from "lit/decorators";
import { dynamicElement } from "../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../common/dom/fire_event";
import "../ha-alert";
import "./ha-form-boolean";
import "./ha-form-constant";
import "./ha-form-grid";
import "./ha-form-float";
import "./ha-form-integer";
import "./ha-form-multi_select";
import "./ha-form-positive_time_period_dict";
import "./ha-form-select";
import "./ha-form-string";
import { HaFormElement, HaFormDataContainer, HaFormSchema } from "./types";
import { HomeAssistant } from "../../types";

const getValue = (obj, item) =>
  obj ? (!item.name ? obj : obj[item.name]) : null;

const getError = (obj, item) => (obj && item.name ? obj[item.name] : null);

let selectorImported = false;

@customElement("ha-form")
export class HaForm extends LitElement implements HaFormElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data!: HaFormDataContainer;

  @property({ attribute: false }) public schema!: readonly HaFormSchema[];

  @property() public error?: Record<string, string>;

  @property({ type: Boolean }) public disabled = false;

  @property() public computeError?: (schema: any, error) => string;

  @property() public computeLabel?: (
    schema: any,
    data: HaFormDataContainer
  ) => string;

  @property() public computeHelper?: (schema: any) => string | undefined;

  public focus() {
    const root = this.shadowRoot?.querySelector(".root");
    if (!root) {
      return;
    }
    for (const child of root.children) {
      if (child.tagName !== "HA-ALERT") {
        (child as HTMLElement).focus();
        break;
      }
    }
  }

  willUpdate(changedProperties: PropertyValues) {
    super.willUpdate(changedProperties);
    if (
      !selectorImported &&
      changedProperties.has("schema") &&
      this.schema?.some((item) => "selector" in item)
    ) {
      selectorImported = true;
      import("../ha-selector/ha-selector");
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

          return html`
            ${error
              ? html`
                  <ha-alert own-margin alert-type="error">
                    ${this._computeError(error, item)}
                  </ha-alert>
                `
              : ""}
            ${"selector" in item
              ? html`<ha-selector
                  .schema=${item}
                  .hass=${this.hass}
                  .selector=${item.selector}
                  .value=${getValue(this.data, item)}
                  .label=${this._computeLabel(item, this.data)}
                  .disabled=${this.disabled}
                  .helper=${this._computeHelper(item)}
                  .required=${item.required || false}
                  .context=${this._generateContext(item)}
                ></ha-selector>`
              : dynamicElement(`ha-form-${item.type}`, {
                  schema: item,
                  data: getValue(this.data, item),
                  label: this._computeLabel(item, this.data),
                  disabled: this.disabled,
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
    root.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      const schema = (ev.target as HaFormElement).schema as HaFormSchema;

      const newValue = !schema.name
        ? ev.detail.value
        : { [schema.name]: ev.detail.value };

      fireEvent(this, "value-changed", {
        value: { ...this.data, ...newValue },
      });
    });
    return root;
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

  static get styles(): CSSResultGroup {
    return css`
      .root {
        margin-bottom: -24px;
        overflow: clip visible;
      }
      .root > * {
        display: block;
      }
      .root > *:not([own-margin]) {
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
