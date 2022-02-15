import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property } from "lit/decorators";
import { dynamicElement } from "../../common/dom/dynamic-element-directive";
import { fireEvent } from "../../common/dom/fire_event";
import "../ha-alert";
import "./ha-form-boolean";
import "./ha-form-constant";
import "./ha-form-float";
import "./ha-form-integer";
import "./ha-form-multi_select";
import "./ha-form-positive_time_period_dict";
import "./ha-form-select";
import "./ha-form-string";
import { HaFormElement, HaFormDataContainer, HaFormSchema } from "./types";
import { HomeAssistant } from "../../types";

const getValue = (obj, item) => (obj ? obj[item.name] : null);

let selectorImported = false;

@customElement("ha-form")
export class HaForm extends LitElement implements HaFormElement {
  @property() public hass!: HomeAssistant;

  @property() public data!: HaFormDataContainer;

  @property() public schema!: HaFormSchema[];

  @property() public error?: Record<string, string>;

  @property({ type: Boolean }) public disabled = false;

  @property() public computeError?: (schema: HaFormSchema, error) => string;

  @property() public computeLabel?: (
    schema: HaFormSchema,
    data?: HaFormDataContainer
  ) => string;

  @property() public computeHelper?: (schema: HaFormSchema) => string;

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

  protected render() {
    return html`
      <div class="root">
        ${this.error && this.error.base
          ? html`
              <ha-alert alert-type="error">
                ${this._computeError(this.error.base, this.schema)}
              </ha-alert>
            `
          : ""}
        ${this.schema.map((item) => {
          const error = getValue(this.error, item);

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
                ></ha-selector>`
              : dynamicElement(`ha-form-${item.type}`, {
                  schema: item,
                  data: getValue(this.data, item),
                  label: this._computeLabel(item, this.data),
                  disabled: this.disabled,
                })}
          `;
        })}
      </div>
    `;
  }

  protected createRenderRoot() {
    const root = super.createRenderRoot();
    // attach it as soon as possible to make sure we fetch all events.
    root.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      const schema = (ev.target as HaFormElement).schema as HaFormSchema;

      fireEvent(this, "value-changed", {
        value: { ...this.data, [schema.name]: ev.detail.value },
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

  private _computeError(error, schema: HaFormSchema | HaFormSchema[]) {
    return this.computeError ? this.computeError(error, schema) : error;
  }

  static get styles(): CSSResultGroup {
    // .root has overflow: auto to avoid margin collapse
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
