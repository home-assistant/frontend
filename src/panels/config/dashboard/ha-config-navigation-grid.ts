import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { filterNavigationPages } from "../../../common/config/filter_navigation_pages";
import { navigate } from "../../../common/navigate";
import "../../../components/ha-card";
import "../../../components/ha-svg-icon";
import type { CloudStatus } from "../../../data/cloud";
import { getConfigEntries } from "../../../data/config_entries";
import type { PageNavigation } from "../../../layouts/hass-tabs-subpage";
import type { HomeAssistant } from "../../../types";
import { supervisorAppsStyle } from "../apps/resources/supervisor-apps-style";

interface NavigationCardTarget extends HTMLElement {
  page?: PageNavigation;
}

@customElement("ha-config-navigation-grid")
class HaConfigNavigationGrid extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public pages!: PageNavigation[];

  @property() public heading?: string;

  @state() private _hasBluetoothConfigEntries = false;

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    getConfigEntries(this.hass, {
      domain: "bluetooth",
    }).then((bluetoothEntries) => {
      this._hasBluetoothConfigEntries = bluetoothEntries.length > 0;
    });
  }

  protected render(): TemplateResult {
    const pages = filterNavigationPages(this.hass, this.pages, {
      hasBluetoothConfigEntries: this._hasBluetoothConfigEntries,
    }).map((page) => {
      const description =
        page.component === "cloud" && (page.info as CloudStatus)
          ? page.info.logged_in
            ? this.hass.localize("ui.panel.config.cloud.description_login")
            : this.hass.localize("ui.panel.config.cloud.description_features")
          : page.description ||
            this.hass.localize(
              `ui.panel.config.dashboard.${page.translationKey}.secondary`
            );
      return {
        ...page,
        name:
          page.name ||
          this.hass.localize(
            `ui.panel.config.dashboard.${page.translationKey}.main`
          ),
        description: description?.trim(),
      };
    });

    return html`
      <div class="content">
        ${this.heading
          ? html`<h2 class="heading">${this.heading}</h2>`
          : nothing}
        <div class="card-group">
          ${pages.map(
            (page) => html`
              <ha-card
                outlined
                class="navigation-card"
                .page=${page}
                tabindex="0"
                role="link"
                @click=${this._handleNavigation}
                @keydown=${this._handleKeyDown}
              >
                <div class="card-content">
                  <div
                    class=${classMap({
                      icon: true,
                      "icon-background": Boolean(page.iconColor),
                    })}
                    style=${page.iconColor
                      ? `background-color: ${page.iconColor}`
                      : ""}
                  >
                    <ha-svg-icon
                      .path=${page.iconPath}
                      .secondaryPath=${page.iconSecondaryPath}
                      .viewBox=${page.iconViewBox}
                    ></ha-svg-icon>
                  </div>
                  <div class="text">
                    <div class="card-title">${page.name}</div>
                    <div class="card-description">${page.description}</div>
                  </div>
                </div>
              </ha-card>
            `
          )}
        </div>
      </div>
    `;
  }

  private _handleNavigation(ev: Event) {
    const target = ev.currentTarget as NavigationCardTarget;
    const page = target.page;
    if (!page) {
      return;
    }
    if (page.path.endsWith("#external-app-configuration")) {
      this.hass.auth.external!.fireMessage({ type: "config_screen/show" });
      return;
    }
    navigate(page.path);
  }

  private _handleKeyDown(ev: KeyboardEvent) {
    if (ev.key !== "Enter" && ev.key !== " ") {
      return;
    }
    ev.preventDefault();
    this._handleNavigation(ev);
  }

  static get styles(): CSSResultGroup {
    return [
      supervisorAppsStyle,
      css`
        :host {
          display: block;
        }

        .heading {
          font-size: var(--ha-font-size-2xl);
          margin-bottom: var(--ha-space-2);
          font-family: var(--ha-font-family-body);
          -webkit-font-smoothing: var(--ha-font-smoothing);
          -moz-osx-font-smoothing: var(--ha-moz-osx-font-smoothing);
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
          padding-left: var(--ha-space-2);
          padding-inline-start: var(--ha-space-2);
          padding-inline-end: initial;
        }

        ha-card {
          cursor: pointer;
          overflow: hidden;
        }

        .card-group {
          grid-template-columns: repeat(auto-fit, minmax(300px, 300px));
          justify-content: start;
        }

        @media (max-width: 623px) {
          .heading {
            text-align: center;
            padding-left: 0;
            padding-inline-start: 0;
          }
          .card-group {
            justify-content: center;
          }
        }

        .card-content {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: var(--ha-space-3);
          padding: var(--ha-space-4);
          align-items: center;
        }

        .icon {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 48px;
          width: 48px;
        }

        .icon-background {
          border-radius: var(--ha-border-radius-circle);
        }

        .icon-background ha-svg-icon {
          color: #fff;
        }

        ha-svg-icon {
          color: var(--secondary-text-color);
          height: 24px;
          width: 24px;
        }

        .card-title {
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-medium);
          color: var(--primary-text-color);
          line-height: var(--ha-line-height-condensed);
        }

        .card-description {
          color: var(--secondary-text-color);
          line-height: var(--ha-line-height-condensed);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .text {
          min-width: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-navigation-grid": HaConfigNavigationGrid;
  }
}
