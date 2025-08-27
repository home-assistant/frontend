import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import type { LocalizeKeys } from "../../../common/translations/localize";
import "../../../components/ha-alert";
import "../../../components/ha-form/ha-form";
import type { HaForm } from "../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../components/ha-form/types";
import type { HaSelector } from "../../../components/ha-selector/ha-selector";
import type { HaActionSelector } from "../../../components/ha-selector/ha-selector-action";
import type { HaConditionSelector } from "../../../components/ha-selector/ha-selector-condition";
import "../../../components/ha-yaml-editor";
import type { Field } from "../../../data/script";
import { SELECTOR_SELECTOR_BUILDING_BLOCKS } from "../../../data/selector/selector_selector";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { indentStyle } from "../automation/styles";

@customElement("ha-script-field-selector-editor")
export default class HaScriptFieldSelectorEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public field!: Field;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean, reflect: true }) public selected = false;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public indent = false;

  @property({ type: Boolean, attribute: "yaml-mode" }) public yamlMode = false;

  @state() private _uiError?: Record<string, string>;

  @state() private _yamlError?: undefined | "yaml_error" | "key_not_unique";

  @query("ha-form")
  private _formElement?: HaForm;

  private _schema = memoizeOne(
    (selector: any) =>
      [
        ...(!this.indent
          ? [
              {
                name: "selector",
                selector: { selector: {} },
              },
            ]
          : []),
        ...(selector &&
        typeof selector === "object" &&
        (this.indent ||
          !SELECTOR_SELECTOR_BUILDING_BLOCKS.includes(Object.keys(selector)[0]))
          ? [
              {
                name: "default",
                selector: !this.indent
                  ? selector
                  : {
                      [Object.keys(selector)[0]]: {
                        ...selector[Object.keys(selector)[0]],
                        optionsInSidebar: true,
                      },
                    },
              },
            ]
          : []),
      ] as const
  );

  protected render() {
    const schema = this._schema(this.field.selector);
    const data = { selector: this.field.selector, default: this.field.default };

    return html`
      ${this.yamlMode
        ? html`${this._yamlError
              ? html`<ha-alert alert-type="error">
                  ${this.hass.localize(
                    `ui.panel.config.script.editor.field.${this._yamlError}`
                  )}
                </ha-alert>`
              : nothing}
            <ha-yaml-editor
              .hass=${this.hass}
              .defaultValue=${data}
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
            .narrow=${this.narrow}
          ></ha-form>`}
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const value = { ...ev.detail.value };

    this._uiError = undefined;

    // If we render the default with an incompatible selector, it risks throwing an exception and not rendering.
    // Clear the default when changing the selector type.
    if (
      !this.indent &&
      Object.keys(this.field.selector)[0] !== Object.keys(value.selector)[0]
    ) {
      value.default = undefined;
    }

    fireEvent(this, "value-changed", { value });
  }

  private _onYamlChange(ev: CustomEvent) {
    ev.stopPropagation();
    const value = { ...ev.detail.value };

    if (typeof value !== "object" || Object.keys(value).length !== 2) {
      this._yamlError = "yaml_error";
      return;
    }

    fireEvent(this, "value-changed", { value });
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ): string =>
    this.hass.localize(
      `ui.panel.config.script.editor.field.${schema.name}` as LocalizeKeys
    ) ?? schema.name;

  private _computeError = (error: string) =>
    this.hass.localize(`ui.panel.config.script.editor.field.${error}` as any) ||
    error;

  private _getSelectorElements() {
    if (this._formElement) {
      const selectors =
        this._formElement.shadowRoot?.querySelectorAll<HaSelector>(
          "ha-selector"
        );

      const selectorElements: (HaConditionSelector | HaActionSelector)[] = [];

      selectors?.forEach((selector) => {
        selectorElements.push(
          ...Array.from(
            selector.shadowRoot?.querySelectorAll<
              HaConditionSelector | HaActionSelector
            >("ha-selector-condition, ha-selector-action") || []
          )
        );
      });
      return selectorElements;
    }
    return [];
  }

  public expandAll() {
    this._getSelectorElements().forEach((element) => {
      element.expandAll?.();
    });
  }

  public collapseAll() {
    this._getSelectorElements().forEach((element) => {
      element.collapseAll?.();
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      indentStyle,
      css`
        :host([indent]) ha-form {
          display: block;
          margin-left: 12px;
          padding: 12px 20px 16px 16px;
          margin-right: -4px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-script-field-selector-editor": HaScriptFieldSelectorEditor;
  }
}
