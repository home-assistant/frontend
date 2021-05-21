import "@polymer/paper-checkbox/paper-checkbox";
import type { PaperCheckboxElement } from "@polymer/paper-checkbox/paper-checkbox";
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
      <paper-checkbox .checked=${this.data} @change=${this._valueChanged}>
        ${this.label}
      </paper-checkbox>
    `;
  }

  private _valueChanged(ev: Event) {
    fireEvent(this, "value-changed", {
      value: (ev.target as PaperCheckboxElement).checked,
    });
  }

  static get styles(): CSSResultGroup {
    return css`
      paper-checkbox {
        display: block;
        padding: 22px 0;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-boolean": HaFormBoolean;
  }
}
