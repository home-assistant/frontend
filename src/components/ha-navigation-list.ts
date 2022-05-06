import "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-list-item";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import type { PageNavigation } from "../layouts/hass-tabs-subpage";
import type { HomeAssistant } from "../types";
import "./ha-clickable-list-item";
import "./ha-icon-next";
import "./ha-svg-icon";

@customElement("ha-navigation-list")
class HaNavigationList extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public pages!: PageNavigation[];

  @property({ type: Boolean }) public hasSecondary = false;

  public render(): TemplateResult {
    return html`
      <mwc-list>
        ${this.pages.map(
          (page) => html`
            <ha-clickable-list-item
              graphic="avatar"
              .twoline=${this.hasSecondary}
              .hasMeta=${!this.narrow}
              @click=${this._entryClicked}
              href=${page.path}
            >
              <div
                slot="graphic"
                class=${page.iconColor ? "icon-background" : ""}
                .style="background-color: ${page.iconColor || "undefined"}"
              >
                <ha-svg-icon .path=${page.iconPath}></ha-svg-icon>
              </div>
              <span>${page.name}</span>
              ${this.hasSecondary
                ? html`<span slot="secondary">${page.description}</span>`
                : ""}
              ${!this.narrow
                ? html`<ha-icon-next slot="meta"></ha-icon-next>`
                : ""}
            </ha-clickable-list-item>
          `
        )}
      </mwc-list>
    `;
  }

  private _entryClicked(ev) {
    ev.currentTarget.blur();
  }

  static styles: CSSResultGroup = css`
    :host {
      --mdc-list-vertical-padding: 0;
    }
    ha-svg-icon,
    ha-icon-next {
      color: var(--secondary-text-color);
      height: 24px;
      width: 24px;
      display: block;
    }
    ha-svg-icon {
      padding: 8px;
    }
    .icon-background {
      border-radius: 50%;
    }
    .icon-background ha-svg-icon {
      color: #fff;
    }
    ha-clickable-list-item {
      cursor: pointer;
      font-size: var(--navigation-list-item-title-font-size);
      padding: var(--navigation-list-item-padding) 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-navigation-list": HaNavigationList;
  }
}
