import { ActionDetail } from "@material/mwc-list/mwc-list";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { navigate } from "../common/navigate";
import type { PageNavigation } from "../layouts/hass-tabs-subpage";
import type { HomeAssistant } from "../types";
import "./ha-icon-next";
import "./ha-list-item";
import "./ha-svg-icon";

@customElement("ha-navigation-list")
class HaNavigationList extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public pages!: PageNavigation[];

  @property({ type: Boolean }) public hasSecondary = false;

  @property() public label?: string;

  public render(): TemplateResult {
    return html`
      <mwc-list
        innerRole="menu"
        itemRoles="menuitem"
        innerAriaLabel=${ifDefined(this.label)}
        @action=${this._handleListAction}
      >
        ${this.pages.map(
          (page) => html`
            <ha-list-item
              graphic="avatar"
              .twoline=${this.hasSecondary}
              .hasMeta=${!this.narrow}
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
            </ha-list-item>
          `
        )}
      </mwc-list>
    `;
  }

  private _handleListAction(ev: CustomEvent<ActionDetail>) {
    const path = this.pages[ev.detail.index].path;
    if (path.endsWith("#external-app-configuration")) {
      this.hass.auth.external!.fireMessage({ type: "config_screen/show" });
    } else {
      navigate(path);
    }
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
    ha-list-item {
      cursor: pointer;
      font-size: var(--navigation-list-item-title-font-size);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-navigation-list": HaNavigationList;
  }
}
