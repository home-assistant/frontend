import {
  customElement,
  LitElement,
  html,
  property,
  TemplateResult,
  CSSResult,
  css,
  query,
} from "lit-element";
import { HaFormElement, HaFormSchema } from "./ha-form";
import { fireEvent } from "../../common/dom/fire_event";

import "@polymer/paper-checkbox/paper-checkbox";
// Not duplicate, is for typing
// tslint:disable-next-line
import { PaperCheckboxElement } from "@polymer/paper-checkbox/paper-checkbox";

@customElement("ha-form-boolean")
export class HaFormBoolean extends LitElement implements HaFormElement {
  @property() public schema!: HaFormSchema;
  @property() public data!: { [key: string]: any };
  @property() public label!: string;
  @property() public suffix!: string;
  @query("paper-checkbox") private _input?: HTMLElement;

  public focus() {
    if (this._input) {
      this._input.focus();
    }
  }

  protected render(): TemplateResult {
    return html`
      <paper-checkbox checked=${this.data} @change=${this._valueChanged}
        >${this.label}</paper-checkbox
      >
    `;
  }

  private _valueChanged(ev: Event) {
    fireEvent(
      this,
      "value-changed",
      {
        value: (ev.target as PaperCheckboxElement).value,
      },
      { bubbles: false }
    );
  }

  static get styles(): CSSResult {
    return css`
      paper-checkbox {
        display: inline-block;
        padding: 22px 0;
      }
    `;
  }
}
