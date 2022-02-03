import "@material/mwc-select";
import type { Select } from "@material/mwc-select";
import "@material/mwc-list/mwc-list-item";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../ha-radio";
import { HaFormElement, HaFormSelectData, HaFormSelectSchema } from "./types";

import { stopPropagation } from "../../common/dom/stop_propagation";
import type { HaRadio } from "../ha-radio";

@customElement("ha-form-select")
export class HaFormSelect extends LitElement implements HaFormElement {
  @property({ attribute: false }) public schema!: HaFormSelectSchema;

  @property() public data!: HaFormSelectData;

  @property() public label!: string;

  @property({ type: Boolean }) public disabled = false;

  @query("mwc-select", true) private _input?: HTMLElement;

  public focus() {
    if (this._input) {
      this._input.focus();
    }
  }

  protected render(): TemplateResult {
    if (this.schema.required && this.schema.options!.length < 6) {
      return html`
        <div>
          ${this.label}
          ${this.schema.options.map(
            ([value, label]) => html`
              <mwc-formfield .label=${label}>
                <ha-radio
                  .checked=${value === this.data}
                  .value=${value}
                  .disabled=${this.disabled}
                  @change=${this._valueChanged}
                ></ha-radio>
              </mwc-formfield>
            `
          )}
        </div>
      `;
    }

    return html`
      <mwc-select
        fixedMenuPosition
        naturalMenuWidth
        .label=${this.label}
        .value=${this.data}
        .disabled=${this.disabled}
        @closed=${stopPropagation}
        @selected=${this._valueChanged}
      >
        ${!this.schema.required
          ? html`<mwc-list-item value=""></mwc-list-item>`
          : ""}
        ${this.schema.options!.map(
          ([value, label]) => html`
            <mwc-list-item .value=${value}>${label}</mwc-list-item>
          `
        )}
      </mwc-select>
    `;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    let value: string | undefined = (ev.target as Select | HaRadio).value;

    if (value === this.data) {
      return;
    }

    if (value === "") {
      value = undefined;
    }

    fireEvent(this, "value-changed", {
      value,
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      mwc-select,
      mwc-formfield {
        display: block;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-select": HaFormSelect;
  }
}
