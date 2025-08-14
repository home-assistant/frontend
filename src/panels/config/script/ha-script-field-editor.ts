import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { slugify } from "../../../common/string/slugify";
import "../../../components/ha-alert";
import "../../../components/ha-automation-row";
import "../../../components/ha-card";
import "../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../components/ha-form/types";
import "../../../components/ha-icon-button";
import "../../../components/ha-md-button-menu";
import "../../../components/ha-md-menu-item";
import "../../../components/ha-yaml-editor";
import type { Field } from "../../../data/script";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";

@customElement("ha-script-field-editor")
export default class HaScriptFieldEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public key!: string;

  @property({ attribute: false, type: Array }) public excludeKeys: string[] =
    [];

  @property({ attribute: false }) public field!: Field;

  @property({ type: Boolean }) public disabled = false;

  @state() private _uiError?: Record<string, string>;

  @state() private _yamlError?: undefined | "yaml_error" | "key_not_unique";

  @state() private _yamlMode = false;

  private _errorKey?: string;

  private _schema = memoizeOne(
    (selector: any) =>
      [
        {
          name: "name",
          selector: { text: {} },
        },
        {
          name: "key",
          selector: { text: {} },
        },
        {
          name: "description",
          selector: { text: {} },
        },
        {
          name: "selector",
          selector: { selector: {} },
        },
        {
          name: "default",
          selector: selector && typeof selector === "object" ? selector : {},
        },
        {
          name: "required",
          selector: { boolean: {} },
        },
      ] as const
  );

  protected render() {
    const schema = this._schema(this.field.selector);
    const data = { ...this.field, key: this._errorKey ?? this.key };

    const yamlValue = { [this.key]: this.field };

    return html`
      ${this._yamlMode
        ? html`${this._yamlError
              ? html`<ha-alert alert-type="error">
                  ${this.hass.localize(
                    `ui.panel.config.script.editor.field.${this._yamlError}`
                  )}
                </ha-alert>`
              : nothing}
            <ha-yaml-editor
              .hass=${this.hass}
              .defaultValue=${yamlValue}
              @value-changed=${this._onYamlChange}
            ></ha-yaml-editor>`
        : html`<ha-form
            .schema=${schema}
            .data=${data}
            .error=${this._uiError}
            .hass=${this.hass}
            .disabled=${this.disabled}
            .computeLabel=${this._computeLabelCallback}
            .computeError=${this._computeError}
            @value-changed=${this._valueChanged}
          ></ha-form>`}
    `;
  }

  private _maybeSetKey(value): void {
    const nameChanged = value.name !== this.field.name;
    const keyChanged = value.key !== this.key;
    if (!nameChanged || keyChanged) {
      return;
    }
    const slugifyName = this.field.name
      ? slugify(this.field.name)
      : this.hass.localize("ui.panel.config.script.editor.field.field") ||
        "field";
    const regex = new RegExp(`^${slugifyName}(_\\d)?$`);
    if (regex.test(this.key)) {
      let key = !value.name
        ? this.hass.localize("ui.panel.config.script.editor.field.field") ||
          "field"
        : slugify(value.name);
      if (this.excludeKeys.includes(key)) {
        let uniqueKey = key;
        let i = 2;
        do {
          uniqueKey = `${key}_${i}`;
          i++;
        } while (this.excludeKeys.includes(uniqueKey));
        key = uniqueKey;
      }
      value.key = key;
    }
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = { ...ev.detail.value };

    this._maybeSetKey(value);

    // Don't allow to set an empty key, or duplicate an existing key.
    if (!value.key || this.excludeKeys.includes(value.key)) {
      this._uiError = value.key
        ? {
            key: "key_not_unique",
          }
        : {
            key: "key_not_null",
          };
      this._errorKey = value.key ?? "";
      return;
    }
    this._errorKey = undefined;
    this._uiError = undefined;

    // If we render the default with an incompatible selector, it risks throwing an exception and not rendering.
    // Clear the default when changing the selector type.
    if (
      Object.keys(this.field.selector)[0] !== Object.keys(value.selector)[0]
    ) {
      delete value.default;
    }

    fireEvent(this, "value-changed", { value });
  }

  private _onYamlChange(ev: CustomEvent) {
    ev.stopPropagation();
    const value = { ...ev.detail.value };

    if (typeof value !== "object" || Object.keys(value).length !== 1) {
      this._yamlError = "yaml_error";
      return;
    }
    const key = Object.keys(value)[0];
    if (this.excludeKeys.includes(key)) {
      this._yamlError = "key_not_unique";
      return;
    }
    this._yamlError = undefined;

    const newValue = { ...value[key], key };

    fireEvent(this, "value-changed", { value: newValue });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string => {
    switch (schema.name) {
      default:
        return this.hass.localize(
          `ui.panel.config.script.editor.field.${schema.name}`
        );
    }
  };

  private _computeError = (error: string) =>
    this.hass.localize(`ui.panel.config.script.editor.field.${error}` as any) ||
    error;

  static get styles(): CSSResultGroup {
    return [haStyle, css``];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-script-field-editor": HaScriptFieldEditor;
  }
}
