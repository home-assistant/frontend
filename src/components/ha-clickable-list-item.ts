import { ListItem } from "@material/mwc-list/mwc-list-item";
import { css, CSSResult, customElement } from "lit-element";
import { html } from "lit-html";

@customElement("ha-clickable-list-item")
export class HaClickableListItem extends ListItem {
  public href?: string;

  public render() {
    const r = super.render();
    const href = this.href ? `/${this.href}` : "";

    return html` ${this.renderRipple()}
      <a aria-role="option" href=${href}>
        ${r}
      </a>`;
  }

  static get styles(): CSSResult[] {
    return [
      super.styles,
      css`
        :host {
          padding-left: 0px;
          padding-right: 0px;
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
          padding-left: var(--mdc-list-side-padding, 16px);
          padding-right: var(--mdc-list-side-padding, 16px);
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
