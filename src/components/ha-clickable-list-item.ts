import { ListItem } from "@material/mwc-list/mwc-list-item";
import { css, CSSResult, customElement, property } from "lit-element";
import { html } from "lit-html";

@customElement("ha-clickable-list-item")
export class HaClickableListItem extends ListItem {
  public href?: string;

  public disableHref = false;

  // property used only in css
  @property({ type: Boolean, reflect: true }) public rtl = false;

  public render() {
    const r = super.render();
    const href = this.href ? `/${this.href}` : "";

    return html` ${this.renderRipple()}
    ${this.disableHref
      ? html`<a aria-role="option">${r}</a>`
      : html`<a aria-role="option" href=${href}>${r}</a>`}`;
  }

  static get styles(): CSSResult[] {
    return [
      super.styles,
      css`
        :host {
          padding-left: 0px;
          padding-right: 0px;
        }

        :host([rtl]) {
          padding-left: var(--mdc-list-side-padding, 0px);
          padding-right: var(--mdc-list-side-padding, 0px);
        }

        :host([rtl]) span {
          margin-left: var(--mdc-list-item-graphic-margin, 20px) !important;
          margin-right: 0px !important;
        }

        :host([graphic="avatar"]:not([twoLine])),
        :host([graphic="icon"]:not([twoLine])) {
          height: 48px;
        }
        a {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          padding-left: var(--mdc-list-side-padding, 20px);
          padding-right: var(--mdc-list-side-padding, 20px);
          font-weight: 500;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-clickable-list-item": HaClickableListItem;
  }
}
