import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../ha-svg-icon";

@customElement("ha-data-table-icon")
class HaDataTableIcon extends LitElement {
  @property() public tooltip!: string;

  @property() public path!: string;

  @state() private _hovered = false;

  protected render(): TemplateResult {
    return html`
      ${this._hovered ? html`<div>${this.tooltip}</div>` : ""}
      <ha-svg-icon .path=${this.path}></ha-svg-icon>
    `;
  }

  protected override firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    const show = () => {
      this._hovered = true;
    };
    const hide = () => {
      this._hovered = false;
    };
    this.addEventListener("mouseenter", show);
    this.addEventListener("focus", show);
    this.addEventListener("mouseleave", hide);
    this.addEventListener("blur", hide);
    this.addEventListener("tap", hide);
  }

  static get styles() {
    return css`
      :host {
        display: inline-block;
        position: relative;
      }
      ha-svg-icon {
        color: var(--secondary-text-color);
      }
      div {
        position: absolute;
        right: 28px;
        z-index: 1002;
        outline: none;
        font-size: 10px;
        line-height: 1;
        background-color: var(--simple-tooltip-background, #616161);
        color: var(--simple-tooltip-text-color, white);
        padding: 8px;
        border-radius: 2px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-data-table-icon": HaDataTableIcon;
  }
}
