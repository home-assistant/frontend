import { mdiCancel, mdiCellphoneArrowDown } from "@mdi/js";
import { HassEntity } from "home-assistant-js-websocket";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateActive } from "../../../common/entity/state_active";
import { supportsFeature } from "../../../common/entity/supports-feature";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import { UNAVAILABLE } from "../../../data/entity";
import {
  UpdateEntity,
  UpdateEntityFeature,
  updateIsInstalling,
} from "../../../data/update";
import { showUpdateBackupDialogParams } from "../../../dialogs/update_backup/show-update-backup-dialog";
import { HomeAssistant } from "../../../types";
import { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { UpdateActionsCardFeatureConfig } from "./types";

export const DEFAULT_UPDATE_BACKUP_OPTION = "ask";

export const supportsUpdateActionsCardFeature = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "update" &&
    supportsFeature(stateObj, UpdateEntityFeature.INSTALL)
  );
};

@customElement("hui-update-actions-card-feature")
class HuiUpdateActionsCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public stateObj?: HassEntity;

  @state() private _config?: UpdateActionsCardFeatureConfig;

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import(
      "../editor/config-elements/hui-update-actions-card-feature-editor"
    );
    return document.createElement("hui-update-actions-card-feature-editor");
  }

  static getStubConfig(): UpdateActionsCardFeatureConfig {
    return {
      type: "update-actions",
      backup: DEFAULT_UPDATE_BACKUP_OPTION,
    };
  }

  public setConfig(config: UpdateActionsCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  private get _installDisabled(): boolean {
    const stateObj = this.stateObj as UpdateEntity;

    if (stateObj.state === UNAVAILABLE) return true;

    const skippedVersion =
      stateObj.attributes.latest_version &&
      stateObj.attributes.skipped_version ===
        stateObj.attributes.latest_version;
    return (
      (!stateActive(stateObj) && !skippedVersion) ||
      updateIsInstalling(stateObj)
    );
  }

  private get _skipDisabled(): boolean {
    const stateObj = this.stateObj as UpdateEntity;

    if (stateObj.state === UNAVAILABLE) return true;

    const skippedVersion =
      stateObj.attributes.latest_version &&
      stateObj.attributes.skipped_version ===
        stateObj.attributes.latest_version;
    return (
      skippedVersion || !stateActive(stateObj) || updateIsInstalling(stateObj)
    );
  }

  private async _install(): Promise<void> {
    const supportsBackup = supportsFeature(
      this.stateObj!,
      UpdateEntityFeature.BACKUP
    );
    let backup = supportsBackup && this._config?.backup === "yes";

    if (supportsBackup && this._config?.backup === "ask") {
      const response = await showUpdateBackupDialogParams(this, {});
      if (response === null) return;
      backup = response;
    }

    this.hass!.callService("update", "install", {
      entity_id: this.stateObj!.entity_id,
      backup: backup,
    });
  }

  private async _skip(): Promise<void> {
    this.hass!.callService("update", "skip", {
      entity_id: this.stateObj!.entity_id,
    });
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.stateObj ||
      !supportsUpdateActionsCardFeature(this.stateObj)
    ) {
      return nothing;
    }

    return html`
      <ha-control-button-group>
        <ha-control-button
          .label=${this.hass.localize(
            "ui.dialogs.more_info_control.update.skip"
          )}
          @click=${this._skip}
          .disabled=${this._skipDisabled}
        >
          <ha-svg-icon .path=${mdiCancel}></ha-svg-icon>
        </ha-control-button>
        <ha-control-button
          .label=${this.hass.localize(
            "ui.dialogs.more_info_control.update.install"
          )}
          @click=${this._install}
          .disabled=${this._installDisabled}
        >
          <ha-svg-icon .path=${mdiCellphoneArrowDown}></ha-svg-icon>
        </ha-control-button>
      </ha-control-button-group>
    `;
  }

  static get styles() {
    return css`
      ha-control-button-group {
        margin: 0 12px 12px 12px;
        --control-button-group-spacing: 12px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-update-actions-card-feature": HuiUpdateActionsCardFeature;
  }
}
