import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import "./ha-ripple";

@customElement("ha-tab")
export class HaTab extends LitElement {
  @property({ type: Boolean, reflect: true }) public active = false;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property() public name?: string;

  protected render(): TemplateResult {
    return html`
      <div
        tabindex="0"
        role="tab"
        aria-selected=${this.active}
        aria-label=${ifDefined(this.name)}
        @keydown=${this._handleKeyDown}
      >
        ${this.narrow ? html`<slot name="icon"></slot>` : ""}
        <span class="name">${this.name}</span>
        <ha-ripple></ha-ripple>
      </div>
    `;
  }

  private _handleKeyDown(ev: KeyboardEvent): void {
    if (ev.key === "Enter") {
      (ev.target as HTMLElement).click();
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      div {
        padding: 0 32px;
        display: flex;
        flex-direction: column;
        text-align: center;
        box-sizing: border-box;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: var(--header-height);
        cursor: pointer;
        position: relative;
        outline: none;
      }

      .name {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }

      :host([active]) {
        color: var(--primary-color);
      }

      :host(:not([narrow])[active]) div {
        border-bottom: 2px solid var(--primary-color);
      }

      :host([narrow]) {
        min-width: 0;
        display: flex;
        justify-content: center;
        overflow: hidden;
      }

      :host([narrow]) div {
        padding: 0 4px;
      }

      div:focus-visible:before {
        position: absolute;
        display: block;
        content: "";
        inset: 0;
        background-color: var(--secondary-text-color);
        opacity: 0.08;
      }
    `;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "ha-tab": HaTab;
  }
}
