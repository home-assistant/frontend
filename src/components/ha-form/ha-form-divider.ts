import { css, html, LitElement } from "lit";
import type { TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import type { HaFormDividerSchema, HaFormElement } from "./types";

@customElement("ha-form-divider")
export class HaFormDivider extends LitElement implements HaFormElement {
  @property({ attribute: false }) public schema!: HaFormDividerSchema;

  protected render(): TemplateResult {
    return html`<hr />`;
  }

  static styles = css`
    :host {
      display: block;
    }
    hr {
      border: none;
      border-top: 1px solid var(--ha-color-border-neutral-quiet);
      margin: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-form-divider": HaFormDivider;
  }
}
