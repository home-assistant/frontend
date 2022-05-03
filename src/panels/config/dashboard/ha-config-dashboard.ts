import type { ActionDetail } from "@material/mwc-list";
import "@material/mwc-list/mwc-list-item";
import { mdiCloudLock, mdiDotsVertical, mdiMagnify } from "@mdi/js";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import { HassEntities } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-next";
import "../../../components/ha-menu-button";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tip";
import { CloudStatus } from "../../../data/cloud";
import {
  checkForEntityUpdates,
  filterUpdateEntitiesWithInstall,
  UpdateEntity,
} from "../../../data/update";
import { showQuickBar } from "../../../dialogs/quick-bar/show-dialog-quick-bar";
import "../../../layouts/ha-app-layout";
import { PageNavigation } from "../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import "../ha-config-section";
import { configSections } from "../ha-panel-config";
import "./ha-config-navigation";
import "./ha-config-updates";

const randomTip = (hass: HomeAssistant, narrow: boolean) => {
  const weighted: string[] = [];
  let tips = [
    {
      content: hass.localize(
        "ui.panel.config.tips.join",
        "forums",
        html`<a
          href="https://community.home-assistant.io"
          target="_blank"
          rel="noreferrer"
          >Forums</a
        >`,
        "twitter",
        html`<a
          href=${documentationUrl(hass, `/twitter`)}
          target="_blank"
          rel="noreferrer"
          >Twitter</a
        >`,
        "discord",
        html`<a
          href=${documentationUrl(hass, `/join-chat`)}
          target="_blank"
          rel="noreferrer"
          >Chat</a
        >`,
        "blog",
        html`<a
          href=${documentationUrl(hass, `/blog`)}
          target="_blank"
          rel="noreferrer"
          >Blog</a
        >`,
        "newsletter",
        html`<span class="keep-together"
          ><a
            href=${documentationUrl(hass, `/newsletter`)}
            target="_blank"
            rel="noreferrer"
            >Newsletter</a
          >
        </span>`
      ),
      weight: 2,
      narrow: true,
    },
    { content: hass.localize("ui.tips.key_c_hint"), weight: 1, narrow: false },
    { content: hass.localize("ui.tips.key_m_hint"), weight: 1, narrow: false },
  ];

  if (narrow) {
    tips = tips.filter((tip) => tip.narrow);
  }

  tips.forEach((tip) => {
    for (let i = 0; i < tip.weight; i++) {
      weighted.push(tip.content);
    }
  });

  return weighted[Math.floor(Math.random() * weighted.length)];
};

@customElement("ha-config-dashboard")
class HaConfigDashboard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true })
  public narrow!: boolean;

  @property() public isWide!: boolean;

  @property() public cloudStatus?: CloudStatus;

  @property() public showAdvanced!: boolean;

  @state() private _tip?: string;

  private _pages = memoizeOne((clouStatus, isLoaded) => {
    const pages: PageNavigation[] = [];
    if (clouStatus && isLoaded) {
      pages.push({
        component: "cloud",
        path: "/config/cloud",
        name: "Home Assistant Cloud",
        info: this.cloudStatus,
        iconPath: mdiCloudLock,
        iconColor: "#3B808E",
      });
    }
    return [...pages, ...configSections.dashboard];
  });

  protected render(): TemplateResult {
    const [canInstallUpdates, totalUpdates] =
      this._filterUpdateEntitiesWithInstall(this.hass.states);

    return html`
      <ha-app-layout>
        <app-header fixed slot="header">
          <app-toolbar>
            <ha-menu-button
              .hass=${this.hass}
              .narrow=${this.narrow}
            ></ha-menu-button>
            <div main-title>${this.hass.localize("panel.config")}</div>
            <ha-icon-button
              .label=${this.hass.localize("ui.dialogs.quick-bar.title")}
              .path=${mdiMagnify}
              @click=${this._showQuickBar}
            ></ha-icon-button>
            <ha-button-menu
              corner="BOTTOM_START"
              @action=${this._handleMenuAction}
              activatable
            >
              <ha-icon-button
                slot="trigger"
                .label=${this.hass.localize("ui.common.menu")}
                .path=${mdiDotsVertical}
              ></ha-icon-button>

              <mwc-list-item>
                ${this.hass.localize("ui.panel.config.updates.check_updates")}
              </mwc-list-item>
            </ha-button-menu>
          </app-toolbar>
        </app-header>

        <ha-config-section
          .narrow=${this.narrow}
          .isWide=${this.isWide}
          full-width
        >
          ${canInstallUpdates.length
            ? html`<ha-card outlined>
                <ha-config-updates
                  .hass=${this.hass}
                  .narrow=${this.narrow}
                  .total=${totalUpdates}
                  .updateEntities=${canInstallUpdates}
                ></ha-config-updates>
                ${totalUpdates > canInstallUpdates.length
                  ? html`<a class="button" href="/config/updates">
                      ${this.hass.localize(
                        "ui.panel.config.updates.more_updates",
                        {
                          count: totalUpdates - canInstallUpdates.length,
                        }
                      )}
                    </a>`
                  : ""}
              </ha-card>`
            : ""}
          <ha-card outlined>
            <ha-config-navigation
              .hass=${this.hass}
              .narrow=${this.narrow}
              .showAdvanced=${this.showAdvanced}
              .pages=${this._pages(
                this.cloudStatus,
                isComponentLoaded(this.hass, "cloud")
              )}
            ></ha-config-navigation>
          </ha-card>
          <ha-tip>${this._tip}</ha-tip>
        </ha-config-section>
      </ha-app-layout>
    `;
  }

  protected override updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (!this._tip && changedProps.has("hass")) {
      this._tip = randomTip(this.hass, this.narrow);
    }
  }

  private _filterUpdateEntitiesWithInstall = memoizeOne(
    (entities: HassEntities): [UpdateEntity[], number] => {
      const updates = filterUpdateEntitiesWithInstall(entities);

      return [
        updates.slice(0, updates.length === 3 ? updates.length : 2),
        updates.length,
      ];
    }
  );

  private _showQuickBar(): void {
    showQuickBar(this, {
      commandMode: true,
      hint: this.hass.localize("ui.dialogs.quick-bar.key_c_hint"),
    });
  }

  private async _handleMenuAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        checkForEntityUpdates(this, this.hass);
        break;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-card:last-child {
          margin-bottom: env(safe-area-inset-bottom);
        }
        :host(:not([narrow])) ha-card:last-child {
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
        a.button {
          display: block;
          color: var(--primary-color);
          padding: 16px;
        }
        .title {
          font-size: 16px;
          padding: 16px;
          padding-bottom: 0;
        }

        @media all and (max-width: 600px) {
          ha-card {
            border-width: 1px 0;
            border-radius: 0;
            box-shadow: unset;
          }
          ha-config-section {
            margin-top: -42px;
          }
        }

        ha-tip {
          margin-bottom: max(env(safe-area-inset-bottom), 8px);
        }

        .new {
          color: var(--primary-color);
        }

        .keep-together {
          display: inline-block;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-dashboard": HaConfigDashboard;
  }
}
