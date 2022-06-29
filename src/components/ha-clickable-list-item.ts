import { ListItemBase } from "@material/mwc-list/mwc-list-item-base";
import { styles } from "@material/mwc-list/mwc-list-item.css";
import { css, CSSResult, html } from "lit";
import { customElement, property, query } from "lit/decorators";

@customElement("ha-clickable-list-item")
export class HaClickableListItem extends ListItemBase {
  @property() public href?: string;

  @property({ type: Boolean }) public disableHref = false;

  // property used only in css
  @property({ type: Boolean, reflect: true }) public rtl = false;

  @property({ type: Boolean, reflect: true }) public openNewTab = false;

  @query("a") private _anchor!: HTMLAnchorElement;

  public render() {
    const r = super.render();
    const href = this.href || "";

    return html`${this.disableHref
      ? html`<a aria-role="option">${r}</a>`
      : html`<a
          aria-role="option"
          target=${this.openNewTab ? "_blank" : ""}
          href=${href}
          >${r}</a
        >`}`;
  }

  firstUpdated() {
    super.firstUpdated();
    this.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") {
        this._anchor.click();
      }
    });
  }

  static get styles(): CSSResult[] {
    return [
      styles,
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
          padding-left: var(--mdc-list-side-padding, 20px);
          padding-right: var(--mdc-list-side-padding, 20px);
          overflow: hidden;
        }
        span.material-icons:first-of-type {
          margin-inline-start: 0px !important;
          margin-inline-end: var(
            --mdc-list-item-graphic-margin,
            16px
          ) !important;
          direction: var(--direction);
        }
        span.material-icons:last-of-type {
          margin-inline-start: auto !important;
          margin-inline-end: 0px !important;
          direction: var(--direction);
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
