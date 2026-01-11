import type { RequestSelectedDetail } from "@material/mwc-list/mwc-list-item";
import { mdiDotsVertical, mdiRefresh } from "@mdi/js";
import type { HassEntities } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { shouldHandleRequestSelectedEvent } from "../../../common/mwc/handle-request-selected-event";
import "../../../components/ha-alert";
import "../../../components/ha-bar";
import "../../../components/ha-button-menu";
import "../../../components/ha-card";
import "../../../components/ha-check-list-item";
import "../../../components/ha-list-item";
import "../../../components/ha-metric";
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

@customElement("ha-config-section-updates")
class HaConfigSectionUpdates extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @state() private _showSkipped = false;

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

    return html`
      <hass-subpage
        back-path="/config/system"
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
          <ha-button-menu multi>
            <ha-icon-button
              slot="trigger"
              .label=${this.hass.localize("ui.common.menu")}
              .path=${mdiDotsVertical}
            ></ha-icon-button>
            <ha-check-list-item
              left
              @request-selected=${this._toggleSkipped}
              .selected=${this._showSkipped}
            >
              ${this.hass.localize("ui.panel.config.updates.show_skipped")}
            </ha-check-list-item>
            ${this._supervisorInfo
              ? html`
                  <li divider role="separator"></li>
                  <ha-list-item
                    @request-selected=${this._toggleBeta}
                    .disabled=${this._supervisorInfo.channel === "dev"}
                  >
                    ${this._supervisorInfo.channel === "stable"
                      ? this.hass.localize("ui.panel.config.updates.join_beta")
                      : this.hass.localize(
                          "ui.panel.config.updates.leave_beta"
                        )}
                  </ha-list-item>
                `
              : nothing}
          </ha-button-menu>
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
      </hass-subpage>
    `;
  }

  private async _refreshSupervisorInfo() {
    this._supervisorInfo = await fetchHassioSupervisorInfo(this.hass);
  }

  private _toggleSkipped(ev: CustomEvent<RequestSelectedDetail>): void {
    if (ev.detail.source !== "property") {
      return;
    }

    this._showSkipped = !this._showSkipped;
  }

  private async _toggleBeta(
    ev: CustomEvent<RequestSelectedDetail>
  ): Promise<void> {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }

    if (this._supervisorInfo!.channel === "stable") {
      showJoinBetaDialog(this, {
        join: async () => this._setChannel("beta"),
      });
    } else {
      this._setChannel("stable");
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
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-section-updates": HaConfigSectionUpdates;
  }
}
