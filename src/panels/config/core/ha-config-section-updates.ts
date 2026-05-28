import "@home-assistant/webawesome/dist/components/divider/divider";
import {
  mdiDotsVertical,
  mdiLocationEnter,
  mdiLocationExit,
  mdiRefresh,
} from "@mdi/js";
import type { HassEntities } from "home-assistant-js-websocket";
import type { TemplateResult, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import type { EntitySources } from "../../../data/entity/entity_sources";
import { fetchEntitySourcesWithCache } from "../../../data/entity/entity_sources";
import { extractApiErrorMessage } from "../../../data/hassio/common";
import type {
  HassioSupervisorInfo,
  SupervisorOptions,
} from "../../../data/hassio/supervisor";
import {
  fetchHassioSupervisorInfo,
  reloadSupervisor,
  setSupervisorOption,
} from "../../../data/hassio/supervisor";
import { domainToName } from "../../../data/integration";
import type { UpdateEntity } from "../../../data/update";
import {
  checkForEntityUpdates,
  filterUpdateEntitiesParameterized,
  installUpdates,
  isSystemUpdate,
} from "../../../data/update";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../types";
import "../dashboard/ha-config-updates";
import { showJoinBetaDialog } from "./updates/show-dialog-join-beta";

interface UpdateGroup {
  key: string;
  title: string;
  entities: UpdateEntity[];
  showUpdateAll: boolean;
}

const SYSTEM_KEY = "__system__";
const APPS_KEY = "__apps__";
const INTEGRATIONS_KEY = "__integrations__";

@customElement("ha-config-section-updates")
class HaConfigSectionUpdates extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _searchParms = new URLSearchParams(window.location.search);

  @state() private _showSkipped = false;

  @state() private _supervisorInfo?: HassioSupervisorInfo;

  @state() private _entitySources?: EntitySources;

  @state() private _loadedIntegrationTitles = new Set<string>();

  protected firstUpdated(changedProps: PropertyValues<this>) {
    super.firstUpdated(changedProps);

    if (isComponentLoaded(this.hass.config, "hassio")) {
      this._refreshSupervisorInfo();
    }

    this._loadEntitySources();
  }

  private async _loadEntitySources() {
    try {
      this._entitySources = await fetchEntitySourcesWithCache(this.hass);
    } catch (_err) {
      // Non-fatal: grouping falls back to entity registry platform lookup.
    }
  }

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);
    this._loadIntegrationTitles();
  }

  private async _loadIntegrationTitles() {
    const domains = new Set<string>();
    for (const entity of Object.values(this.hass.states)) {
      if (!entity.entity_id.startsWith("update.")) continue;
      const platform = this.hass.entities[entity.entity_id]?.platform;
      if (platform && !this._loadedIntegrationTitles.has(platform)) {
        domains.add(platform);
      }
    }
    if (!domains.size) return;
    const toLoad = Array.from(domains);
    toLoad.forEach((d) => this._loadedIntegrationTitles.add(d));
    await this.hass.loadBackendTranslation("title", toLoad);
    this.requestUpdate();
  }

  protected render(): TemplateResult {
    const installableUpdates = this._filterInstallableUpdateEntities(
      this.hass.states,
      this._showSkipped
    );
    const notInstallableUpdates = this._filterNotInstallableUpdateEntities(
      this.hass.states,
      this._showSkipped
    );

    const groups = this._groupUpdates(installableUpdates, this._entitySources);

    return html`
      <hass-subpage
        .backPath=${this._searchParms.has("historyBack")
          ? undefined
          : "/config/system"}
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${this.hass.localize("ui.panel.config.updates.caption")}
      >
        <div slot="toolbar-icon">
          <ha-icon-button
            .label=${this.hass.localize(
              "ui.panel.config.updates.check_updates"
            )}
            .path=${mdiRefresh}
            @click=${this._checkUpdates}
          ></ha-icon-button>
          <ha-dropdown @wa-select=${this._handleOverflowAction}>
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            ></ha-icon-button>

            <ha-dropdown-item
              type="checkbox"
              .checked=${this._showSkipped}
              value="show_skipped"
            >
              ${this.hass.localize("ui.panel.config.updates.show_skipped")}
            </ha-dropdown-item>
            ${this._supervisorInfo
              ? html`
                  <wa-divider></wa-divider>
                  <ha-dropdown-item
                    value="toggle_beta"
                    .disabled=${this._supervisorInfo.channel === "dev"}
                  >
                    <ha-svg-icon
                      .path=${this._supervisorInfo.channel === "stable"
                        ? mdiLocationEnter
                        : mdiLocationExit}
                      slot="icon"
                    ></ha-svg-icon>
                    ${this.hass.localize(
                      `ui.panel.config.updates.${this._supervisorInfo.channel === "stable" ? "join" : "leave"}_beta`
                    )}
                  </ha-dropdown-item>
                `
              : nothing}
          </ha-dropdown>
        </div>
        <div class="content">
          ${groups.map(
            (group) => html`
              <ha-card outlined>
                <div class="card-content">
                  <div class="card-header">
                    <div class="title" role="heading" aria-level="2">
                      ${group.title}
                    </div>
                    ${group.showUpdateAll
                      ? html`
                          <ha-button
                            appearance="plain"
                            size="small"
                            .group=${group}
                            @click=${this._updateAll}
                          >
                            ${this.hass.localize(
                              "ui.panel.config.updates.update_all"
                            )}
                          </ha-button>
                        `
                      : nothing}
                  </div>
                  <ha-config-updates
                    .hass=${this.hass}
                    .narrow=${this.narrow}
                    .updateEntities=${group.entities}
                    showAll
                  ></ha-config-updates>
                </div>
              </ha-card>
            `
          )}
          ${notInstallableUpdates.length
            ? html`
                <ha-card outlined>
                  <div class="card-content">
                    <div class="card-header">
                      <div class="title" role="heading" aria-level="2">
                        ${this.hass.localize(
                          "ui.panel.config.updates.title_not_installable",
                          {
                            count: notInstallableUpdates.length,
                          }
                        )}
                      </div>
                    </div>
                    <ha-config-updates
                      .hass=${this.hass}
                      .narrow=${this.narrow}
                      .updateEntities=${notInstallableUpdates}
                      showAll
                    ></ha-config-updates>
                  </div>
                </ha-card>
              `
            : nothing}
          ${groups.length + notInstallableUpdates.length
            ? nothing
            : html`
                <ha-card outlined>
                  <div class="no-updates">
                    ${this.hass.localize("ui.panel.config.updates.no_updates")}
                  </div>
                </ha-card>
              `}
        </div>
      </hass-subpage>
    `;
  }

  private async _refreshSupervisorInfo() {
    this._supervisorInfo = await fetchHassioSupervisorInfo(this.hass);
  }

  private _handleOverflowAction(ev: HaDropdownSelectEvent): void {
    if (ev.detail.item.value === "toggle_beta") {
      if (this._supervisorInfo!.channel === "stable") {
        showJoinBetaDialog(this, {
          join: () => this._setChannel("beta"),
        });
      } else {
        this._setChannel("stable");
      }
    } else if (ev.detail.item.value === "show_skipped") {
      this._showSkipped = !this._showSkipped;
    }
  }

  private async _setChannel(
    channel: SupervisorOptions["channel"]
  ): Promise<void> {
    try {
      await setSupervisorOption(this.hass, {
        channel,
      });
      await reloadSupervisor(this.hass);
      await this._refreshSupervisorInfo();
    } catch (err: any) {
      showAlertDialog(this, {
        text: extractApiErrorMessage(err),
      });
    }
  }

  private async _checkUpdates(): Promise<void> {
    checkForEntityUpdates(this, this.hass);
  }

  private async _updateAll(ev: Event) {
    const group = (ev.currentTarget as any).group as UpdateGroup;
    try {
      await installUpdates(
        this.hass,
        group.entities.map((entity) => entity.entity_id)
      );
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize("ui.panel.config.updates.update_all_failed"),
        text: err.message,
        warning: true,
      });
    }
  }

  private _filterInstallableUpdateEntities = memoizeOne(
    (entities: HassEntities, showSkipped: boolean) =>
      filterUpdateEntitiesParameterized(entities, showSkipped, false)
  );

  private _filterNotInstallableUpdateEntities = memoizeOne(
    (entities: HassEntities, showSkipped: boolean) =>
      filterUpdateEntitiesParameterized(entities, showSkipped, true)
  );

  private _groupUpdates = memoizeOne(
    (
      entities: UpdateEntity[],
      entitySources: EntitySources | undefined
    ): UpdateGroup[] => {
      if (!entities.length) {
        return [];
      }

      const localize = this.hass.localize;

      const systemEntities: UpdateEntity[] = [];
      const appEntities: UpdateEntity[] = [];
      const byDomain = new Map<string, UpdateEntity[]>();
      const otherIntegrationEntities: UpdateEntity[] = [];

      for (const entity of entities) {
        if (isSystemUpdate(entity)) {
          systemEntities.push(entity);
          continue;
        }
        const domain =
          entitySources?.[entity.entity_id]?.domain ??
          this.hass.entities[entity.entity_id]?.platform;
        if (domain === "hassio") {
          appEntities.push(entity);
          continue;
        }
        if (!domain) {
          otherIntegrationEntities.push(entity);
          continue;
        }
        if (!byDomain.has(domain)) {
          byDomain.set(domain, []);
        }
        byDomain.get(domain)!.push(entity);
      }

      const multiInstanceGroups: UpdateGroup[] = [];
      byDomain.forEach((entries, domain) => {
        if (entries.length >= 2) {
          multiInstanceGroups.push({
            key: domain,
            title: domainToName(localize, domain),
            entities: entries,
            showUpdateAll: true,
          });
        } else {
          otherIntegrationEntities.push(...entries);
        }
      });

      multiInstanceGroups.sort((a, b) =>
        caseInsensitiveStringCompare(
          a.title,
          b.title,
          this.hass.locale.language
        )
      );

      const groups: UpdateGroup[] = [];

      if (systemEntities.length) {
        groups.push({
          key: SYSTEM_KEY,
          title: localize("ui.panel.config.updates.group_system"),
          entities: systemEntities,
          showUpdateAll: false,
        });
      }

      groups.push(...multiInstanceGroups);

      if (otherIntegrationEntities.length) {
        groups.push({
          key: INTEGRATIONS_KEY,
          title: localize("ui.panel.config.updates.group_integrations"),
          entities: otherIntegrationEntities,
          showUpdateAll: true,
        });
      }

      if (appEntities.length) {
        groups.push({
          key: APPS_KEY,
          title: localize("ui.panel.config.updates.group_apps"),
          entities: appEntities,
          showUpdateAll: true,
        });
      }

      return groups;
    }
  );

  static styles = css`
    .content {
      padding: 28px 20px 0;
      max-width: 1040px;
      margin: 0 auto;
    }
    ha-card {
      max-width: 600px;
      margin: 0 auto;
      height: 100%;
      justify-content: space-between;
      flex-direction: column;
      display: flex;
      margin-bottom: max(24px, var(--safe-area-inset-bottom));
    }
    ha-config-updates {
      margin-bottom: 8px;
    }

    .card-content {
      display: flex;
      justify-content: space-between;
      flex-direction: column;
      padding: 0;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--ha-space-2);
      padding: var(--ha-space-4) var(--ha-space-2) 0 var(--ha-space-4);
    }

    .title {
      font-size: var(--ha-font-size-l);
    }

    .no-updates {
      padding: 16px;
    }
    li[divider] {
      border-bottom-color: var(--divider-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-section-updates": HaConfigSectionUpdates;
  }
}
