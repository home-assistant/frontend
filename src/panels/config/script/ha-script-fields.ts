import "@material/mwc-button";
import { mdiPlus } from "@mdi/js";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-button";
import "../../../components/ha-button-menu";
import "../../../components/ha-svg-icon";
import { Fields } from "../../../data/script";
import { sortableStyles } from "../../../resources/ha-sortable-style";
import { HomeAssistant } from "../../../types";
import { slugify } from "../../../common/string/slugify";
import type HaScriptFieldRow from "./ha-script-field-row";
import "./ha-script-field-row";

@customElement("ha-script-fields")
export default class HaScriptFields extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public disabled = false;

  @property() public fields!: Fields;

  private _focusLastActionOnChange = false;

  protected render() {
    return html`
      ${this.fields
        ? html`<div class="fields">
            ${Object.entries(this.fields).map(
              ([key, field]) => html`
                <ha-script-field-row
                  .key=${key}
                  .field=${field}
                  .disabled=${this.disabled}
                  @value-changed=${this._fieldChanged}
                  .hass=${this.hass}
                >
                </ha-script-field-row>
              `
            )}
          </div> `
        : nothing}
      <ha-button
        outlined
        @click=${this._addField}
        .disabled=${this.disabled}
        .label=${this.hass.localize("ui.panel.config.script.editor.add_field")}
      >
        <ha-svg-icon .path=${mdiPlus} slot="icon"></ha-svg-icon>
      </ha-button>
    `;
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);

    if (changedProps.has("fields") && this._focusLastActionOnChange) {
      this._focusLastActionOnChange = false;

      const row = this.shadowRoot!.querySelector<HaScriptFieldRow>(
        "ha-script-field-row:last-of-type"
      )!;
      row.updateComplete.then(() => {
        row.expand();
        row.scrollIntoView();
        row.focus();
      });
    }
  }

  private _addField() {
    const key = this._getUniqueKey("new_field", this.fields || {});
    const fields = { ...(this.fields || {}), [key]: {} };
    this._focusLastActionOnChange = true;
    fireEvent(this, "value-changed", { value: fields });
  }

  private _fieldChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const newValue = ev.detail.value;
    const key = (ev.target as any).key;

    const nameChanged =
      newValue !== null && this.fields[key].name !== newValue.name;
    let fields: Fields = {};

    // If the field name is changed, change the key as well, but recreate the entire object
    // to maintain the same insertion order.
    if (nameChanged) {
      const oldFields = { ...this.fields };
      delete oldFields[key];
      const newKey = this._getUniqueKey(
        slugify(newValue.name || "unnamed_field"),
        oldFields
      );
      Object.entries(this.fields).forEach(([k, v]) => {
        if (k === key) {
          fields[newKey] = newValue;
        } else fields[k] = v;
      });
    } else {
      fields = { ...this.fields };
      if (newValue === null) {
        delete fields[key];
      } else {
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

  static get styles(): CSSResultGroup {
    return [
      sortableStyles,
      css`
        ha-script-field-row {
          display: block;
          margin-bottom: 16px;
          scroll-margin-top: 48px;
        }
        ha-svg-icon {
          height: 20px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-script-fields": HaScriptFields;
  }
}
