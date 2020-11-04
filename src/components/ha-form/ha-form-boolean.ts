import "@polymer/paper-checkbox/paper-checkbox";
import type { PaperCheckboxElement } from "@polymer/paper-checkbox/paper-checkbox";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  query,
  TemplateResult,
} from "lit-element";
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

  static get styles(): CSSResult {
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
