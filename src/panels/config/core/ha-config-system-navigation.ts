import "@material/mwc-list/mwc-list-item";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-card";
import "../../../components/ha-navigation-list";
import { CloudStatus } from "../../../data/cloud";
import "../../../layouts/ha-app-layout";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import "../ha-config-section";
import { configSections } from "../ha-panel-config";

@customElement("ha-config-system-navigation")
class HaConfigSystemNavigation extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true })
  public narrow!: boolean;

  @property() public isWide!: boolean;

  @property() public cloudStatus?: CloudStatus;

  @property() public showAdvanced!: boolean;

  protected render(): TemplateResult {
    const pages = configSections.general.map((page) => ({
      ...page,
      name: page.translationKey
        ? this.hass.localize(page.translationKey)
        : page.name,
    }));

    return html`
      <ha-app-layout>
        <app-header fixed slot="header">
          <app-toolbar>
            <ha-menu-button
              .hass=${this.hass}
              .narrow=${this.narrow}
            ></ha-menu-button>
            <div main-title>
              ${this.hass.localize("ui.panel.config.dashboard.system.title")}
            </div>
          </app-toolbar>
        </app-header>

        <ha-config-section
          .narrow=${this.narrow}
          .isWide=${this.isWide}
          full-width
        >
          <ha-card>
            ${this.narrow
              ? html`<div class="title">
                  ${this.hass.localize(
                    "ui.panel.config.dashboard.system.title"
                  )}
                </div>`
              : ""}
            <ha-navigation-list
              .hass=${this.hass}
              .narrow=${this.narrow}
              .pages=${pages}
            ></ha-navigation-list>
          </ha-card>
        </ha-config-section>
      </ha-app-layout>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-card {
          margin-bottom: env(safe-area-inset-bottom);
        }
        :host(:not([narrow])) ha-card {
          margin-bottom: max(24px, env(safe-area-inset-bottom));
        }

        ha-config-section {
          margin: auto;
          margin-top: -32px;
          max-width: 600px;
        }

        ha-card {
          overflow: hidden;
        }

        ha-card a {
          text-decoration: none;
          color: var(--primary-text-color);
        }

        .title {
          font-size: 16px;
          padding: 16px;
          padding-bottom: 0;
        }

        :host([narrow]) ha-card {
          border-radius: 0;
          box-shadow: unset;
        }

        :host([narrow]) ha-config-section {
          margin-top: -42px;
        }

        ha-navigation-list {
          --navigation-list-item-title-font-size: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-system-navigation": HaConfigSystemNavigation;
  }
}
