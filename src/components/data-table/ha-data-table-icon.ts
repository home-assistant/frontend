import { css, html, LitElement, TemplateResult } from "lit";
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

  public connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("mouseenter", this._show);
    this.addEventListener("focus", this._show);
    this.addEventListener("mouseleave", this._hide);
    this.addEventListener("blur", this._hide);
    this.addEventListener("tap", this._hide);
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener("mouseenter", this._show);
    this.removeEventListener("focus", this._show);
    this.removeEventListener("mouseleave", this._hide);
    this.removeEventListener("blur", this._hide);
    this.removeEventListener("tap", this._hide);
  }

  private _show = () => {
    this._hovered = true;
  };

  private _hide = () => {
    this._hovered = false;
  };

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
