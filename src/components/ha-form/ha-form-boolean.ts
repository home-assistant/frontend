import "@material/mwc-formfield";
import "@material/mwc-checkbox";
import type { Checkbox } from "@material/mwc-checkbox";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import type {
  HaFormBooleanData,
  HaFormBooleanSchema,
  HaFormElement,
} from "./ha-form";

@customElement("ha-form-boolean")
export class HaFormBoolean extends LitElement implements HaFormElement {
  @property() public schema!: HaFormBooleanSchema;

  @property() public data!: HaFormBooleanData;

  @property() public label!: string;

  @property() public suffix!: string;

  @query("paper-checkbox", true) private _input?: HTMLElement;

  public focus() {
    if (this._input) {
      this._input.focus();
    }
  }

  protected render(): TemplateResult {
    return html`
      <mwc-formfield .label=${this.label}>
        <mwc-checkbox
          .checked=${this.data}
          @change=${this._valueChanged}
        ></mwc-checkbox>
      </mwc-formfield>
    `;
  }

  private _valueChanged(ev: Event) {
    fireEvent(this, "value-changed", {
      value: (ev.target as Checkbox).checked,
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      mwc-checkbox {
        --mdc-theme-secondary: var(--primary-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-boolean": HaFormBoolean;
  }
}
