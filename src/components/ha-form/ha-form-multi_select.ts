import "@material/mwc-textfield";
import "@material/mwc-formfield";
import "@material/mwc-checkbox";
import type { Checkbox } from "@material/mwc-checkbox";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { stopPropagation } from "../../common/dom/stop_propagation";
import "../ha-button-menu";
import "../ha-icon";
import {
  HaFormElement,
  HaFormMultiSelectData,
  HaFormMultiSelectSchema,
} from "./ha-form";

function optionValue(item: string | string[]): string {
  return Array.isArray(item) ? item[0] : item;
}

function optionLabel(item: string | string[]): string {
  return Array.isArray(item) ? item[1] || item[0] : item;
}

@customElement("ha-form-multi_select")
export class HaFormMultiSelect extends LitElement implements HaFormElement {
  @property() public schema!: HaFormMultiSelectSchema;

  @property() public data!: HaFormMultiSelectData;

  @property() public label!: string;

  @property() public suffix!: string;

  @query("paper-menu-button", true) private _input?: HTMLElement;

  public focus(): void {
    if (this._input) {
      this._input.focus();
    }
  }

  protected render(): TemplateResult {
    const options = Array.isArray(this.schema.options)
      ? this.schema.options
      : Object.entries(this.schema.options!);

    const data = this.data || [];

    return html`
      <ha-button-menu fixed corner="BOTTOM_START" @closed=${stopPropagation}>
        <mwc-textfield
          slot="trigger"
          .label=${this.label}
          .value=${data
            .map((value) => this.schema.options![value] || value)
            .join(", ")}
          tabindex="-1"
        ></mwc-textfield>
        ${options.map((item: string | [string, string]) => {
          const value = optionValue(item);
          return html`
            <mwc-formfield .label=${optionLabel(item)}>
              <mwc-checkbox
                .checked=${data.includes(value)}
                .value=${value}
                @change=${this._valueChanged}
              ></mwc-checkbox>
            </mwc-formfield>
          `;
        })}
      </ha-button-menu>
    `;
  }

  protected firstUpdated() {
    this.updateComplete.then(() => {
      const input =
        // @ts-expect-error
        this.shadowRoot?.querySelector("mwc-textfield")?.formElement;
      if (input) {
        input.style.textOverflow = "ellipsis";
        input.setAttribute("readonly", "");
      }
    });
  }

  private _valueChanged(ev: CustomEvent): void {
    const { value, checked } = ev.target as Checkbox;

    let newValue: string[];

    if (checked) {
      if (!this.data) {
        newValue = [value];
      } else if (this.data.includes(value)) {
        return;
      } else {
        newValue = [...this.data, value];
      }
    } else {
      if (!this.data.includes(value)) {
        return;
      }
      newValue = this.data.filter((v) => v !== value);
    }

    fireEvent(
      this,
      "value-changed",
      {
        value: newValue,
      },
      { bubbles: false }
    );
  }

  static get styles(): CSSResultGroup {
    return css`
      :host {
        --mdc-theme-secondary: var(--primary-color);
      }
      ha-button-menu,
      mwc-textfield,
      mwc-formfield {
        display: block;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-multi_select": HaFormMultiSelect;
  }
}
