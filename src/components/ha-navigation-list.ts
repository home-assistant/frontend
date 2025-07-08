import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import type { PageNavigation } from "../layouts/hass-tabs-subpage";
import type { HomeAssistant } from "../types";
import "./ha-icon-next";
import "./ha-svg-icon";
import "./ha-md-list";
import "./ha-md-list-item";

@customElement("ha-navigation-list")
class HaNavigationList extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public pages!: PageNavigation[];

  @property({ attribute: "has-secondary", type: Boolean })
  public hasSecondary = false;

  @property() public label?: string;

  public render(): TemplateResult {
    return html`
      <ha-md-list
        innerRole="menu"
        itemRoles="menuitem"
        innerAriaLabel=${ifDefined(this.label)}
      >
        ${this.pages.map((page) => {
          const externalApp = page.path.endsWith("#external-app-configuration");
          return html`
            <ha-md-list-item
              .type=${externalApp ? "button" : "link"}
              .href=${externalApp ? undefined : page.path}
              @click=${externalApp ? this._handleExternalApp : undefined}
            >
              <div
                slot="start"
                class=${page.iconColor ? "icon-background" : ""}
                .style="background-color: ${page.iconColor || "undefined"}"
              >
                <ha-svg-icon .path=${page.iconPath}></ha-svg-icon>
              </div>
              <span slot="headline">${page.name}</span>
              ${this.hasSecondary
                ? html`<span slot="supporting-text">${page.description}</span>`
                : ""}
              ${!this.narrow
                ? html`<ha-icon-next slot="end"></ha-icon-next>`
                : ""}
            </ha-md-list-item>
          `;
        })}
      </ha-md-list>
    `;
  }

  private _handleExternalApp() {
    this.hass.auth.external!.fireMessage({ type: "config_screen/show" });
  }

  static styles: CSSResultGroup = css`
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
    ha-md-list-item {
      font-size: var(--navigation-list-item-title-font-size);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-navigation-list": HaNavigationList;
  }
}
