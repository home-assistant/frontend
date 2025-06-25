import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-control-button-group")
export class HaControlButtonGroup extends LitElement {
  @property({ type: Boolean, reflect: true })
  public vertical = false;

  @property({ attribute: "no-fill", type: Boolean, reflect: true })
  public noFill = false;

  protected render(): TemplateResult {
    return html`
      <div class="container">
        <slot></slot>
      </div>
    `;
  }

  static styles = css`
    :host {
      --control-button-group-spacing: 12px;
      --control-button-group-thickness: 40px;
      height: var(--control-button-group-thickness);
      width: auto;
      display: block;
    }
    .container {
      display: flex;
      flex-direction: row;
      justify-content: var(--control-button-group-alignment, start);
      width: 100%;
      height: 100%;
    }
    ::slotted(*) {
      flex: 1;
      height: 100%;
      width: 100%;
    }
    ::slotted(*:not(:last-child)) {
      margin-right: var(--control-button-group-spacing);
      margin-inline-end: var(--control-button-group-spacing);
      margin-inline-start: initial;
      direction: var(--direction);
    }
    :host([vertical]) {
      width: var(--control-button-group-thickness);
      height: auto;
    }
    :host([vertical]) .container {
      flex-direction: column;
    }
    :host([vertical]) ::slotted(ha-control-button:not(:last-child)) {
      margin-right: initial;
      margin-inline-end: initial;
      margin-bottom: var(--control-button-group-spacing);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-control-button-group": HaControlButtonGroup;
  }
}
