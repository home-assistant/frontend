import { css, CSSResultGroup, html } from "lit";
import { customElement, property, query } from "lit/decorators";
import { HaListItem } from "./ha-list-item";

@customElement("ha-clickable-list-item")
export class HaClickableListItem extends HaListItem {
  @property() public href?: string;

  @property({ type: Boolean }) public disableHref = false;

  @property({ type: Boolean, reflect: true }) public openNewTab = false;

  @query("a") private _anchor!: HTMLAnchorElement;

  public render() {
    const r = super.render();
    const href = this.href || "";

    return html`${this.disableHref
      ? html`<a>${r}</a>`
      : html`<a target=${this.openNewTab ? "_blank" : ""} href=${href}
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

  static get styles(): CSSResultGroup {
    return [
      super.styles,
      css`
        a {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          overflow: hidden;
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
