import "@material/mwc-select";
import type { Select } from "@material/mwc-select";
import "@material/mwc-list/mwc-list-item";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../ha-svg-icon";
import { HaFormElement, HaFormSelectData, HaFormSelectSchema } from "./ha-form";
import { stopPropagation } from "../../common/dom/stop_propagation";

@customElement("ha-form-select")
export class HaFormSelect extends LitElement implements HaFormElement {
  @property({ attribute: false }) public schema!: HaFormSelectSchema;

  @property() public data!: HaFormSelectData;

  @property() public label!: string;

  @property() public suffix!: string;

  @query("mwc-select", true) private _input?: HTMLElement;

  public focus() {
    if (this._input) {
      this._input.focus();
    }
  }

  protected render(): TemplateResult {
    return html`
      <mwc-select
        fixedMenuPosition
        .label=${this.label}
        .value=${this.data}
        @closed=${stopPropagation}
        @selected=${this._valueChanged}
      >
        ${this.schema.optional
          ? html`<mwc-list-item value=""></mwc-list-item>`
          : ""}
        ${this.schema.options!.map(
          (item: string | [string, string]) => html`
            <mwc-list-item .value=${this._optionValue(item)}>
              ${this._optionLabel(item)}
            </mwc-list-item>
          `
        )}
      </mwc-select>
    `;
  }

  private _optionValue(item: string | [string, string]) {
    return Array.isArray(item) ? item[0] : item;
  }

  private _optionLabel(item: string | [string, string]) {
    return Array.isArray(item) ? item[1] || item[0] : item;
  }

  private _valueChanged(ev: CustomEvent) {
    ev.stopPropagation();
    let value: string | undefined = (ev.target as Select).value;

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
      mwc-select {
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
