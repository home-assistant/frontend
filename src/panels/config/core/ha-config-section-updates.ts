import {
  mdiFormatListChecks,
  mdiDotsVertical,
  mdiLocationEnter,
  mdiLocationExit,
  mdiMenuDown,
  mdiRefresh,
} from "@mdi/js";
import type { HassEntities } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/ha-card";
import "../../../components/ha-fab";
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
import {
  checkForEntityUpdates,
  filterUpdateEntitiesParameterized,
} from "../../../data/update";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-subpage";
import type { HomeAssistant } from "../../../types";
import "../dashboard/ha-config-updates";
import { showJoinBetaDialog } from "./updates/show-dialog-join-beta";
import "../../../components/chips/ha-assist-chip";
import "../../../components/ha-dropdown";
import "../../../components/ha-dropdown-item";
import "@home-assistant/webawesome/dist/components/divider/divider";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";

@customElement("ha-config-section-updates")
class HaConfigSectionUpdates extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _searchParms = new URLSearchParams(window.location.search);

  @state() private _showSkipped = false;

  @state() private _multiSelectMode = false;

  @state() private _selectedEntities = new Set<string>();

  @state() private _supervisorInfo?: HassioSupervisorInfo;

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);

    if (isComponentLoaded(this.hass, "hassio")) {
      this._refreshSupervisorInfo();
    }
  }

  protected render(): TemplateResult {
    const canInstallUpdates = this._filterInstallableUpdateEntities(
      this.hass.states,
      this._showSkipped
    );
    const notInstallableUpdates = this._filterNotInstallableUpdateEntities(
      this.hass.states,
      this._showSkipped
    );

    const selectedInstallableIds = canInstallUpdates
      .filter((e) => this._selectedEntities.has(e.entity_id))
      .map((e) => e.entity_id);
    const selectedCount = this._selectedEntities.size;
    const showFabs = this._multiSelectMode && selectedCount > 0;

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
          <ha-dropdown @wa-select=${this._handleSelectDropdown}>
            <ha-assist-chip
              .label=${this.hass.localize(
                "ui.components.subpage-data-table.select"
              )}
              slot="trigger"
            >
              <ha-svg-icon
                slot="icon"
                .path=${mdiFormatListChecks}
              ></ha-svg-icon>
              <ha-svg-icon
                slot="trailing-icon"
                .path=${mdiMenuDown}
              ></ha-svg-icon>
            </ha-assist-chip>
            ${this._multiSelectMode
              ? html`
                  <ha-dropdown-item value="all">
                    ${this.hass.localize(
                      "ui.components.subpage-data-table.select_all"
                    )}
                  </ha-dropdown-item>
                  <ha-dropdown-item value="none">
                    ${this.hass.localize(
                      "ui.components.subpage-data-table.select_none"
                    )}
                  </ha-dropdown-item>
                  <wa-divider></wa-divider>
                  <ha-dropdown-item value="disable_select_mode">
                    ${this.hass.localize(
                      "ui.components.subpage-data-table.exit_selection_mode"
                    )}
                  </ha-dropdown-item>
                `
              : html`
                  <ha-dropdown-item value="enable_select_mode">
                    ${this.hass.localize(
                      "ui.components.subpage-data-table.enter_selection_mode"
                    )}
                  </ha-dropdown-item>
                `}
          </ha-dropdown>
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
          ${canInstallUpdates.length
            ? html`
                <ha-card outlined>
                  <div class="card-content">
                    <ha-config-updates
                      .hass=${this.hass}
                      .narrow=${this.narrow}
                      .updateEntities=${canInstallUpdates}
                      .isInstallable=${true}
                      .multiSelectMode=${this._multiSelectMode}
                      .selectedEntities=${this._selectedEntities}
                      @update-entity-selected=${this._handleSelectionChanged}
                      showAll
                    ></ha-config-updates>
                  </div>
                </ha-card>
              `
            : nothing}
          ${notInstallableUpdates.length
            ? html`
                <ha-card outlined>
                  <div class="card-content">
                    <ha-config-updates
                      .hass=${this.hass}
                      .narrow=${this.narrow}
                      .updateEntities=${notInstallableUpdates}
                      .isInstallable=${false}
                      .multiSelectMode=${this._multiSelectMode}
                      .selectedEntities=${this._selectedEntities}
                      @update-entity-selected=${this._handleSelectionChanged}
                      showAll
                    ></ha-config-updates>
                  </div>
                </ha-card>
              `
            : nothing}
          ${canInstallUpdates.length + notInstallableUpdates.length
            ? nothing
            : html`
                <ha-card outlined>
                  <div class="no-updates">
                    ${this.hass.localize("ui.panel.config.updates.no_updates")}
                  </div>
                </ha-card>
              `}
        </div>
        <div class="fab-container ${showFabs ? "visible" : ""}">
          ${selectedInstallableIds.length
            ? html`
                <ha-fab
                  extended
                  .label=${this.hass.localize(
                    "ui.dialogs.more_info_control.update.update"
                  ) + ` (${selectedInstallableIds.length})`}
                  @click=${this._installSelected}
                ></ha-fab>
              `
            : nothing}
          <ha-fab
            extended
            .label=${this.hass.localize(
              "ui.dialogs.more_info_control.update.skip"
            ) + ` (${selectedCount})`}
            class="skip-fab"
            @click=${this._skipSelected}
          ></ha-fab>
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

  private _toggleMultiSelectMode(): void {
    this._multiSelectMode = !this._multiSelectMode;
    if (!this._multiSelectMode) {
      this._selectedEntities = new Set();
    }
  }

  private _handleSelectDropdown(ev: HaDropdownSelectEvent): void {
    const action = ev.detail.item.value;
    switch (action) {
      case "enable_select_mode":
        ev.preventDefault();
        this._toggleMultiSelectMode();
        break;
      case "disable_select_mode":
        this._toggleMultiSelectMode();
        break;
      case "all":
        this._selectAll();
        break;
      case "none":
        this._selectNone();
        break;
    }
  }

  private _selectAll(): void {
    const allEntities = [
      ...this._filterInstallableUpdateEntities(
        this.hass.states,
        this._showSkipped
      ),
      ...this._filterNotInstallableUpdateEntities(
        this.hass.states,
        this._showSkipped
      ),
    ];
    this._selectedEntities = new Set(allEntities.map((e) => e.entity_id));
  }

  private _selectNone(): void {
    this._selectedEntities = new Set();
  }

  private _handleSelectionChanged(ev: CustomEvent<{ entityId: string }>): void {
    const { entityId } = ev.detail;
    const updated = new Set(this._selectedEntities);
    if (updated.has(entityId)) {
      updated.delete(entityId);
    } else {
      updated.add(entityId);
    }
    this._selectedEntities = updated;
  }

  private _installSelected(): void {
    const installableIds = this._filterInstallableUpdateEntities(
      this.hass.states,
      this._showSkipped
    )
      .filter((e) => this._selectedEntities.has(e.entity_id))
      .map((e) => e.entity_id);

    for (const entityId of installableIds) {
      this.hass.callService("update", "install", { entity_id: entityId });
    }
    this._selectedEntities = new Set();
    this._multiSelectMode = false;
  }

  private _skipSelected(): void {
    for (const entityId of this._selectedEntities) {
      this.hass.callService("update", "skip", { entity_id: entityId });
    }
    this._selectedEntities = new Set();
    this._multiSelectMode = false;
  }

  private _filterInstallableUpdateEntities = memoizeOne(
    (entities: HassEntities, showSkipped: boolean) =>
      filterUpdateEntitiesParameterized(entities, showSkipped, false)
  );

  private _filterNotInstallableUpdateEntities = memoizeOne(
    (entities: HassEntities, showSkipped: boolean) =>
      filterUpdateEntitiesParameterized(entities, showSkipped, true)
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

    .no-updates {
      padding: 16px;
    }
    li[divider] {
      border-bottom-color: var(--divider-color);
    }
    .fab-container ha-fab {
      --ha-fab-icon-display: none;
    }
    .fab-container {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: var(--ha-space-2);
      position: fixed;
      bottom: calc(-160px - var(--safe-area-inset-bottom, 0px));
      right: calc(var(--ha-space-4) + var(--safe-area-inset-right, 0px));
      inset-inline-end: calc(
        var(--ha-space-4) + var(--safe-area-inset-right, 0px)
      );
      inset-inline-start: initial;
      transition: bottom 0.3s;
    }
    .fab-container.visible {
      bottom: calc(var(--ha-space-4) + var(--safe-area-inset-bottom, 0px));
    }
    .skip-fab {
      /* ha-fab sets --mdc-theme-secondary inline in firstUpdated; !important overrides it */
      --mdc-theme-secondary: var(--card-background-color) !important;
      --mdc-theme-on-secondary: var(--secondary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-section-updates": HaConfigSectionUpdates;
  }
}
