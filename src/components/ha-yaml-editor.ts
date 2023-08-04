import { DEFAULT_SCHEMA, dump, load, Schema } from "js-yaml";
import { html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import type { HomeAssistant } from "../types";
import "./ha-code-editor";

const isEmpty = (obj: Record<string, unknown>): boolean => {
  if (typeof obj !== "object") {
    return false;
  }
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      return false;
    }
  }
  return true;
};

@customElement("ha-yaml-editor")
export class HaYamlEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public value?: any;

  @property({ attribute: false }) public yamlSchema: Schema = DEFAULT_SCHEMA;

  @property() public defaultValue?: any;

  @property({ type: Boolean }) public isValid = true;

  @property() public label?: string;

  @property({ type: Boolean }) public autoUpdate = false;

  @property({ type: Boolean }) public readOnly = false;

  @property({ type: Boolean }) public required = false;

  @state() private _yaml = "";

  public setValue(value): void {
    try {
      this._yaml =
        value && !isEmpty(value)
          ? dump(value, {
              schema: this.yamlSchema,
              quotingType: '"',
              noRefs: true,
            })
          : "";
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error(err, value);
      alert(`There was an error converting to YAML: ${err}`);
    }
  }

  protected firstUpdated(): void {
    if (this.defaultValue) {
      this.setValue(this.defaultValue);
    }
  }

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    if (this.autoUpdate && changedProperties.has("value")) {
      this.setValue(this.value);
    }
  }

  protected render() {
    if (this._yaml === undefined) {
      return nothing;
    }
    return html`
      ${this.label
        ? html`<p>${this.label}${this.required ? " *" : ""}</p>`
        : ""}
      <ha-code-editor
        .hass=${this.hass}
        .value=${this._yaml}
        .readOnly=${this.readOnly}
        mode="yaml"
        autocomplete-entities
        autocomplete-icons
        .error=${this.isValid === false}
        @value-changed=${this._onChange}
        dir="ltr"
      ></ha-code-editor>
    `;
  }

  private _onChange(ev: CustomEvent): void {
    ev.stopPropagation();
    this._yaml = ev.detail.value;
    let parsed;
    let isValid = true;

    if (this._yaml) {
      try {
        parsed = load(this._yaml, { schema: this.yamlSchema });
      } catch (err: any) {
        // Invalid YAML
        isValid = false;
      }
    } else {
      parsed = {};
    }

    this.value = parsed;
    this.isValid = isValid;

    fireEvent(this, "value-changed", { value: parsed, isValid } as any);
  }

  get yaml() {
    return this._yaml;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-yaml-editor": HaYamlEditor;
  }
}
