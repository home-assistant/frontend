import {
  mdiCloudLock,
  mdiDotsVertical,
  mdiMagnify,
  mdiPower,
  mdiRefresh,
  mdiViewGrid,
  mdiViewList,
} from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/chips/ha-assist-chip";
import "../../../components/ha-card";
import "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-next";
import "../../../components/ha-menu-button";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tip";
import "../../../components/ha-top-app-bar-fixed";
import type { CloudStatus } from "../../../data/cloud";
import { saveFrontendUserData } from "../../../data/frontend";
import type { RepairsIssue } from "../../../data/repairs";
import {
  severitySort,
  subscribeRepairsIssueRegistry,
} from "../../../data/repairs";
import type { UpdateEntity } from "../../../data/update";
import {
  checkForEntityUpdates,
  filterUpdateEntitiesParameterized,
} from "../../../data/update";
import { showQuickBar } from "../../../dialogs/quick-bar/show-dialog-quick-bar";
import { showRestartDialog } from "../../../dialogs/restart/show-dialog-restart";
import { showShortcutsDialog } from "../../../dialogs/shortcuts/show-shortcuts-dialog";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { isMobileClient } from "../../../util/is_mobile";
import "../ha-config-section";
import { configSections } from "../ha-panel-config";
import "../repairs/ha-config-repairs";
import "./ha-config-navigation";
import "./ha-config-navigation-grid";
import "./ha-config-updates";
import "./ha-config-updates-grid";

const randomTip = (openFn: any, hass: HomeAssistant, narrow: boolean) => {
  const weighted: string[] = [];
  let tips = [
    {
      content: hass.localize("ui.panel.config.tips.join", {
        forums: html`<a
          href="https://community.home-assistant.io"
          target="_blank"
          rel="noreferrer"
          >${hass.localize("ui.panel.config.tips.join_forums")}</a
        >`,
        twitter: html`<a
          href=${documentationUrl(hass, `/twitter`)}
          target="_blank"
          rel="noreferrer"
          >${hass.localize("ui.panel.config.tips.join_x")}</a
        >`,
        mastodon: html`<a
          href=${documentationUrl(hass, `/mastodon`)}
          target="_blank"
          rel="noreferrer"
          >${hass.localize("ui.panel.config.tips.join_mastodon")}</a
        >`,
        bluesky: html`<a
          href=${documentationUrl(hass, `/bluesky`)}
          target="_blank"
          rel="noreferrer"
          >${hass.localize("ui.panel.config.tips.join_bluesky")}</a
        >`,
        discord: html`<a
          href=${documentationUrl(hass, `/join-chat`)}
          target="_blank"
          rel="noreferrer"
          >${hass.localize("ui.panel.config.tips.join_chat")}</a
        >`,
        blog: html`<a
          href=${documentationUrl(hass, `/blog`)}
          target="_blank"
          rel="noreferrer"
          >${hass.localize("ui.panel.config.tips.join_blog")}</a
        >`,
        newsletter: html`<span class="keep-together"
          ><a
            href="https://newsletter.openhomefoundation.org/"
            target="_blank"
            rel="noreferrer"
            >${hass.localize("ui.panel.config.tips.join_newsletter")}</a
          >
        </span>`,
      }),
      weight: 2,
      narrow: true,
    },
  ];

  if (hass?.enableShortcuts && !isMobileClient) {
    const localizeParam = {
      keyboard_shortcut: html`<a href="#" @click=${openFn}
        >${hass.localize("ui.tips.keyboard_shortcut")}</a
      >`,
    };

    tips.push(
      {
        content: hass.localize("ui.tips.key_c_tip", localizeParam),
        weight: 1,
        narrow: false,
      },
      {
        content: hass.localize("ui.tips.key_m_tip", localizeParam),
        weight: 1,
        narrow: false,
      },
      {
        content: hass.localize("ui.tips.key_a_tip", localizeParam),
        weight: 1,
        narrow: false,
      }
    );
  }

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
class HaConfigDashboard extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public cloudStatus?: CloudStatus;

  @state() private _tip?: string;

  @state() private _view: "list" | "grid" = "list";

  @state() private _repairsIssues: { issues: RepairsIssue[]; total: number } = {
    issues: [],
    total: 0,
  };

  private _pages = memoizeOne(
    (cloudStatus, isCloudLoaded, hasExternalSettings) => [
      isCloudLoaded
        ? [
            {
              component: "cloud",
              path: "/config/cloud",
              name: "Home Assistant Cloud",
              info: cloudStatus,
              iconPath: mdiCloudLock,
              iconColor: "#3B808E",
              translationKey: "cloud",
            },
            ...configSections.dashboard,
          ]
        : configSections.dashboard,
      hasExternalSettings ? configSections.dashboard_external_settings : [],
      configSections.dashboard_2,
      configSections.dashboard_3,
    ]
  );

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeRepairsIssueRegistry(this.hass.connection!, (repairs) => {
        const repairsIssues = repairs.issues.filter((issue) => !issue.ignored);

        this._repairsIssues = {
          issues: repairsIssues
            .sort((a, b) => severitySort[a.severity] - severitySort[b.severity])
            .slice(0, repairsIssues.length === 3 ? repairsIssues.length : 2),
          total: repairsIssues.length,
        };

        const integrations = new Set<string>();
        for (const issue of this._repairsIssues.issues) {
          integrations.add(issue.domain);
        }
        this.hass.loadBackendTranslation("issues", [...integrations]);
      }),
    ];
  }

  protected render(): TemplateResult {
    const isGridView = this._view === "grid";
    const { updates: canInstallUpdates, total: totalUpdates } =
      this._filterUpdateEntitiesParameterized(
        this.hass.states,
        this.hass.entities
      );

    const { issues: repairsIssues, total: totalRepairIssues } =
      this._repairsIssues;

    const categoryPages = this._pages(
      this.cloudStatus,
      isComponentLoaded(this.hass, "cloud"),
      this.hass.auth.external?.config.hasSettingsScreen
    );

    const groupTitles = [
      this.hass.localize("ui.panel.config.dashboard.groups.home_assistant"),
      this.hass.localize("ui.panel.config.dashboard.groups.external_settings"),
      this.hass.localize("ui.panel.config.dashboard.groups.connections"),
      this.hass.localize("ui.panel.config.dashboard.groups.system"),
    ];

    return html`
      <ha-top-app-bar-fixed .narrow=${this.narrow}>
        <ha-menu-button
          slot="navigationIcon"
          .hass=${this.hass}
          .narrow=${this.narrow}
        ></ha-menu-button>
        <div slot="title">${this.hass.localize("panel.config")}</div>

        <ha-icon-button
          slot="actionItems"
          .label=${this.hass.localize("ui.dialogs.quick-bar.title")}
          .path=${mdiMagnify}
          @click=${this._showQuickBar}
        ></ha-icon-button>
        <ha-dropdown slot="actionItems" @wa-select=${this._handleMenuAction}>
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>

          <ha-dropdown-item value="check-updates">
            ${this.hass.localize("ui.panel.config.updates.check_updates")}
            <ha-svg-icon slot="icon" .path=${mdiRefresh}></ha-svg-icon>
          </ha-dropdown-item>

          <ha-dropdown-item value="restart">
            ${this.hass.localize(
              "ui.panel.config.system_dashboard.restart_homeassistant"
            )}
            <ha-svg-icon slot="icon" .path=${mdiPower}></ha-svg-icon>
          </ha-dropdown-item>
          <wa-divider></wa-divider>
          <ha-dropdown-item
            value="list-view"
            class=${this._view === "list" ? "selected" : ""}
          >
            ${this.hass.localize("ui.panel.config.dashboard.view.list")}
            <ha-svg-icon slot="icon" .path=${mdiViewList}></ha-svg-icon>
          </ha-dropdown-item>
          <ha-dropdown-item
            value="grid-view"
            class=${this._view === "grid" ? "selected" : ""}
          >
            ${this.hass.localize("ui.panel.config.dashboard.view.grid")}
            <ha-svg-icon slot="icon" .path=${mdiViewGrid}></ha-svg-icon>
          </ha-dropdown-item>
        </ha-dropdown>

        <ha-config-section
          .narrow=${this.narrow}
          .isWide=${this.isWide}
          full-width
          class=${classMap({ "grid-view": isGridView })}
        >
          ${repairsIssues.length || canInstallUpdates.length
            ? isGridView
              ? html`
                  ${repairsIssues.length
                    ? html`
                        <ha-card outlined>
                          <ha-config-repairs
                            .hass=${this.hass}
                            .narrow=${this.narrow}
                            .total=${totalRepairIssues}
                            .repairsIssues=${repairsIssues}
                          ></ha-config-repairs>
                          ${totalRepairIssues > repairsIssues.length
                            ? html`
                                <ha-assist-chip
                                  href="/config/repairs"
                                  .label=${this.hass.localize(
                                    "ui.panel.config.repairs.more_repairs",
                                    {
                                      count:
                                        totalRepairIssues -
                                        repairsIssues.length,
                                    }
                                  )}
                                >
                                </ha-assist-chip>
                              `
                            : ""}
                        </ha-card>
                      `
                    : ""}
                  ${canInstallUpdates.length
                    ? html`
                        <ha-config-updates-grid
                          .hass=${this.hass}
                          .narrow=${this.narrow}
                          .total=${totalUpdates}
                          .updateEntities=${canInstallUpdates}
                          .isInstallable=${true}
                        ></ha-config-updates-grid>
                      `
                    : ""}
                `
              : html`
                  <ha-card outlined>
                    ${repairsIssues.length
                      ? html`
                          <ha-config-repairs
                            .hass=${this.hass}
                            .narrow=${this.narrow}
                            .total=${totalRepairIssues}
                            .repairsIssues=${repairsIssues}
                          ></ha-config-repairs>
                          ${totalRepairIssues > repairsIssues.length
                            ? html`
                                <ha-assist-chip
                                  href="/config/repairs"
                                  .label=${this.hass.localize(
                                    "ui.panel.config.repairs.more_repairs",
                                    {
                                      count:
                                        totalRepairIssues -
                                        repairsIssues.length,
                                    }
                                  )}
                                >
                                </ha-assist-chip>
                              `
                            : ""}
                        `
                      : ""}
                    ${repairsIssues.length && canInstallUpdates.length
                      ? html`<hr />`
                      : ""}
                    ${canInstallUpdates.length
                      ? html`
                          <ha-config-updates
                            .hass=${this.hass}
                            .narrow=${this.narrow}
                            .total=${totalUpdates}
                            .updateEntities=${canInstallUpdates}
                            .isInstallable=${true}
                          ></ha-config-updates>
                          ${totalUpdates > canInstallUpdates.length
                            ? html`
                                <ha-assist-chip
                                  href="/config/updates"
                                  label=${this.hass.localize(
                                    "ui.panel.config.updates.more_updates",
                                    {
                                      count:
                                        totalUpdates -
                                        canInstallUpdates.length,
                                    }
                                  )}
                                >
                                </ha-assist-chip>
                              `
                            : ""}
                        `
                      : ""}
                  </ha-card>
                `
            : ""}
          ${categoryPages.map((group, index) =>
            group.length === 0
              ? nothing
              : isGridView
                ? html`
                    <ha-config-navigation-grid
                      .hass=${this.hass}
                      .narrow=${this.narrow}
                      .pages=${group}
                      .heading=${groupTitles[index]}
                    ></ha-config-navigation-grid>
                  `
                : html`
                    <ha-card outlined>
                      <ha-config-navigation
                        .hass=${this.hass}
                        .narrow=${this.narrow}
                        .pages=${group}
                      ></ha-config-navigation>
                    </ha-card>
                  `
          )}
          <ha-tip .hass=${this.hass}>${this._tip}</ha-tip>
        </ha-config-section>
      </ha-top-app-bar-fixed>
    `;
  }

  protected override updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    if (!this._tip && changedProps.has("hass")) {
      this._tip = randomTip(this._openShortcutDialog, this.hass, this.narrow);
    }

    if (changedProps.has("hass")) {
      const storedView =
        this.hass.userData?.config_dashboard_view ?? ("list" as const);
      if (this._view !== storedView) {
        this._view = storedView;
      }
    }
  }

  private _openShortcutDialog(ev: Event) {
    ev.preventDefault();

    showShortcutsDialog(this);
  }

  private _filterUpdateEntitiesParameterized = memoizeOne(
    (
      entities: HomeAssistant["states"],
      entityRegistry: HomeAssistant["entities"]
    ): { updates: UpdateEntity[]; total: number } => {
      const updates = filterUpdateEntitiesParameterized(
        entities,
        false,
        false
      ).filter((entity) => !entityRegistry[entity.entity_id]?.hidden);

      return {
        updates: updates.slice(0, updates.length === 3 ? updates.length : 2),
        total: updates.length,
      };
    }
  );

  private _showQuickBar(): void {
    const params = {
      keyboard_shortcut: html`<a href="#" @click=${this._openShortcutDialog}
        >${this.hass.localize("ui.tips.keyboard_shortcut")}</a
      >`,
    };

    showQuickBar(this, {
      hint: this.hass.enableShortcuts
        ? this.hass.localize("ui.dialogs.quick-bar.key_c_tip", params)
        : undefined,
    });
  }

  private async _handleMenuAction(
    ev: CustomEvent<{ item: { value: string } }>
  ) {
    const action = ev.detail.item.value;
    switch (action) {
      case "check-updates":
        checkForEntityUpdates(this, this.hass);
        break;
      case "restart":
        showRestartDialog(this);
        break;
      case "list-view":
        this._setView("list");
        break;
      case "grid-view":
        this._setView("grid");
        break;
    }
  }

  private _setView(view: "list" | "grid") {
    if (this._view === view) {
      return;
    }
    this._view = view;
    saveFrontendUserData(this.hass.connection, "core", {
      ...this.hass.userData,
      config_dashboard_view: view,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host(:not([narrow])) ha-card:last-child {
          margin-bottom: 24px;
        }

        ha-config-section {
          margin: auto;
          margin-top: -32px;
          max-width: 600px;
        }

        ha-config-section.grid-view {
          max-width: 1600px;
        }

        ha-card {
          overflow: hidden;
        }
        ha-card a {
          text-decoration: none;
          color: var(--primary-text-color);
        }

        ha-assist-chip {
          margin: 8px 16px 16px 16px;
        }

        .title {
          font-size: var(--ha-font-size-l);
          padding: 16px;
          padding-bottom: 0;
        }

        @media all and (max-width: 600px) {
          ha-card {
            border-width: 1px 0;
            border-radius: var(--ha-border-radius-square);
            box-shadow: unset;
          }
          ha-config-section {
            margin-top: -42px;
          }
          ha-config-section.grid-view {
            margin-top: 0;
          }
        }

        ha-tip {
          margin-bottom: 8px;
        }

        .new {
          color: var(--primary-color);
        }

        .keep-together {
          display: inline-block;
        }

        hr {
          height: 1px;
          background-color: var(
            --ha-card-border-color,
            var(--divider-color, #e0e0e0)
          );
          border: none;
          margin-top: 0;
        }

        ha-dropdown-item.selected {
          font-weight: var(--ha-font-weight-medium);
          color: var(--primary-color);
          background-color: var(--ha-color-fill-primary-quiet-resting);
          --icon-primary-color: var(--primary-color);
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
