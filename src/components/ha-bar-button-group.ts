import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";

@customElement("ha-bar-button-group")
export class HaBarButtonGroup extends LitElement {
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
        --button-bar-group-spacing: 12px;
        --button-bar-group-thickness: 40px;
        height: var(--button-bar-group-thickness);
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
        margin-right: var(--button-bar-group-spacing);
        margin-inline-end: var(--button-bar-group-spacing);
        margin-inline-start: initial;
        direction: var(--direction);
      }
      :host([vertical]) {
        width: var(--button-bar-group-thickness);
        height: auto;
      }
      :host([vertical]) .container {
        flex-direction: column;
      }
      :host([vertical]) ::slotted(ha-bar-button:not(:last-child)) {
        margin-right: initial;
        margin-inline-end: initial;
        margin-bottom: var(--button-bar-group-spacing);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-bar-button-group": HaBarButtonGroup;
  }
}
