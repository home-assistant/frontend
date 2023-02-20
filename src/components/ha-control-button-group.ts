import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-control-button-group")
export class HaControlButtonGroup extends LitElement {
  @property({ type: Boolean, reflect: true })
  public vertical = false;

  protected render(): TemplateResult {
    return html`
      <div class="container">
        <slot></slot>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
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
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-control-button-group": HaControlButtonGroup;
  }
}
