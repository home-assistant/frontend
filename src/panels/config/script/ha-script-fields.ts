import { mdiPlus } from "@mdi/js";
import type { PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button";
import "../../../components/ha-button-menu";
import type { HaForm } from "../../../components/ha-form/ha-form";
import "../../../components/ha-svg-icon";
import type { Fields } from "../../../data/script";
import type { HomeAssistant } from "../../../types";
import type HaAutomationAction from "../automation/action/ha-automation-action";
import type HaAutomationCondition from "../automation/condition/ha-automation-condition";
import "./ha-script-field-row";
import type HaScriptFieldRow from "./ha-script-field-row";
import type HaScriptFieldSelectorEditor from "./ha-script-field-selector-editor";

@customElement("ha-script-fields")
export default class HaScriptFields extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property({ attribute: false }) public fields!: Fields;

  @property({ attribute: false }) public highlightedFields?: Fields;

  @property({ type: Boolean }) public narrow = false;

  private _focusLastActionOnChange = false;

  protected render() {
    return html`
      ${this.fields
        ? html`<div class="fields">
            ${Object.entries(this.fields).map(
              ([key, field]) => html`
                <ha-script-field-row
                  .key=${key}
                  .excludeKeys=${Object.keys(this.fields).filter(
                    (k) => k !== key
                  )}
                  .field=${field}
                  .disabled=${this.disabled}
                  @value-changed=${this._fieldChanged}
                  .hass=${this.hass}
                  ?highlight=${this.highlightedFields?.[key] !== undefined}
                  .narrow=${this.narrow}
                >
                </ha-script-field-row>
              `
            )}
          </div> `
        : nothing}
      <ha-button @click=${this._addField} .disabled=${this.disabled}>
        <ha-svg-icon .path=${mdiPlus} slot="start"></ha-svg-icon>
        ${this.hass.localize("ui.panel.config.script.editor.field.add_field")}
      </ha-button>
    `;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (changedProps.has("fields") && this._focusLastActionOnChange) {
      this._focusLastActionOnChange = false;
      this.focusLastField();
    }
  }

  public focusLastField() {
    const row = this.shadowRoot!.querySelector<HaScriptFieldRow>(
      "ha-script-field-row:last-of-type"
    )!;
    row.updateComplete.then(() => {
      row.openSidebar();
      row.focus();

      if (this.narrow) {
        row.scrollIntoView({
          block: "start",
          behavior: "smooth",
        });
      }
    });
  }

  private _addField() {
    const key = this._getUniqueKey(
      this.hass.localize("ui.panel.config.script.editor.field.field") ||
        "field",
      this.fields || {}
    );
    const fields = {
      ...(this.fields || {}),
      [key]: {
        selector: {
          text: null,
        },
      },
    };
    this._focusLastActionOnChange = true;
    fireEvent(this, "value-changed", { value: fields });
  }

  private _fieldChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const key = (ev.target as any).key;
    let fields: Fields = {};
    if (ev.detail.value === null) {
      fields = { ...this.fields };
      delete fields[key];
    } else {
      const newValue = { ...ev.detail.value };
      const newKey = newValue.key;
      delete newValue.key;
      const keyChanged = key !== newKey;

      // If key is changed, recreate the object to maintain the same insertion order.
      if (keyChanged) {
        Object.entries(this.fields).forEach(([k, v]) => {
          if (k === key) {
            fields[newKey] = newValue;
          } else fields[k] = v;
        });
      } else {
        fields = { ...this.fields };
        fields[key] = newValue;
      }
    }
    fireEvent(this, "value-changed", { value: fields });
  }

  private _getUniqueKey(base: string, fields: Fields): string {
    let key = base;
    if (base in fields) {
      let i = 2;
      do {
        key = `${base}_${i}`;
        i++;
      } while (key in fields);
    }
    return key;
  }

  private _getRowElements() {
    return this.shadowRoot!.querySelectorAll<HaScriptFieldRow>(
      "ha-script-field-row"
    );
  }

  private _getChildCollapsableElements(
    row: HaScriptFieldRow
  ): NodeListOf<HaAutomationAction | HaAutomationCondition> | undefined {
    const editor = row.shadowRoot!.querySelector<HaScriptFieldSelectorEditor>(
      "ha-script-field-selector-editor"
    );
    if (editor) {
      const form = editor.shadowRoot?.querySelector<HaForm>("ha-form");
      if (form) {
        const selector = form.shadowRoot?.querySelector("ha-selector");
        if (selector) {
          const buildingBlockSelector = selector.shadowRoot?.querySelector(
            "ha-selector-condition, ha-selector-action"
          );
          if (buildingBlockSelector) {
            return buildingBlockSelector.shadowRoot?.querySelectorAll<
              HaAutomationAction | HaAutomationCondition
            >("ha-automation-action, ha-automation-condition");
          }
        }
      }
    }
    return undefined;
  }

  public expandAll() {
    this._getRowElements().forEach((row) => {
      row.expand();
      row.expandSelectorRow();

      const childElements = this._getChildCollapsableElements(row);
      if (childElements) {
        childElements.forEach((element) => {
          element.expandAll();
        });
      }
    });
  }

  public collapseAll() {
    this._getRowElements().forEach((row) => {
      row.collapse();
      row.collapseSelectorRow();

      const childElements = this._getChildCollapsableElements(row);
      if (childElements) {
        childElements.forEach((element) => {
          element.collapseAll();
        });
      }
    });
  }

  static styles = css`
    ha-script-field-row {
      display: block;
      margin-bottom: 16px;
      scroll-margin-top: 48px;
    }
    ha-svg-icon {
      height: 20px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-script-fields": HaScriptFields;
  }
}
