import { css, CSSResultGroup, html, LitElement } from "lit";
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

const getValue = (obj, item) => (obj ? obj[item.name] : null);

@customElement("ha-form")
export class HaForm extends LitElement implements HaFormElement {
  @property() public data!: HaFormDataContainer;

  @property() public schema!: HaFormSchema[];

  @property() public error?: Record<string, string>;

  @property({ type: Boolean }) public disabled = false;

  @property() public computeError?: (schema: HaFormSchema, error) => string;

  @property() public computeLabel?: (schema: HaFormSchema) => string;

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
            ${dynamicElement(`ha-form-${item.type}`, {
              schema: item,
              data: getValue(this.data, item),
              label: this._computeLabel(item),
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

  private _computeLabel(schema: HaFormSchema) {
    return this.computeLabel
      ? this.computeLabel(schema)
      : schema
      ? schema.name
      : "";
  }

  private _computeError(error, schema: HaFormSchema | HaFormSchema[]) {
    return this.computeError ? this.computeError(error, schema) : error;
  }

  static get styles(): CSSResultGroup {
    // .root has overflow: auto to avoid margin collapse
    return css`
      .root {
        margin-bottom: -24px;
        overflow: auto;
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
