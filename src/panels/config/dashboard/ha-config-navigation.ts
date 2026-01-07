import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { canShowPage } from "../../../common/config/can_show_page";
import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import "../../../components/ha-navigation-list";
import type { CloudStatus } from "../../../data/cloud";
import { getConfigEntries } from "../../../data/config_entries";
import type { PageNavigation } from "../../../layouts/hass-tabs-subpage";
import type { HomeAssistant } from "../../../types";

@customElement("ha-config-navigation")
class HaConfigNavigation extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public pages!: PageNavigation[];

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
    const pages = this.pages
      .filter((page) => {
        if (page.path === "#external-app-configuration") {
          return this.hass.auth.external?.config.hasSettingsScreen;
        }
        // Only show Bluetooth page if there are Bluetooth config entries
        if (page.component === "bluetooth") {
          return this._hasBluetoothConfigEntries;
        }
        return canShowPage(this.hass, page);
      })
      .map((page) => ({
        ...page,
        name:
          page.name ||
          this.hass.localize(
            `ui.panel.config.dashboard.${page.translationKey}.main`
          ),
        description:
          page.component === "cloud" && (page.info as CloudStatus)
            ? page.info.logged_in
              ? `
                  ${this.hass.localize(
                    "ui.panel.config.cloud.description_login"
                  )}
                `
              : `
                  ${this.hass.localize(
                    "ui.panel.config.cloud.description_features"
                  )}
                `
            : `
                ${
                  page.description ||
                  this.hass.localize(
                    `ui.panel.config.dashboard.${page.translationKey}.secondary`
                  )
                }
              `,
      }));
    return html`
      <div class="visually-hidden" role="heading" aria-level="2">
        ${this.hass.localize("panel.config")}
      </div>
      <ha-navigation-list
        has-secondary
        .hass=${this.hass}
        .narrow=${this.narrow}
        .pages=${pages}
        .label=${this.hass.localize("panel.config")}
      ></ha-navigation-list>
    `;
  }

  static styles: CSSResultGroup = css`
    ha-navigation-list {
      --navigation-list-item-title-font-size: var(--ha-font-size-l);
    }
    /* Accessibility */
    .visually-hidden {
      position: absolute;
      overflow: hidden;
      clip: rect(0 0 0 0);
      height: 1px;
      width: 1px;
      margin: -1px;
      padding: 0;
      border: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-navigation": HaConfigNavigation;
  }
}
