import { consume } from "@lit/context";
import { mdiCancel, mdiCellphoneArrowDown } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  consumeEntityState,
  consumeLocalize,
} from "../../../common/decorators/consume-context-entry";
import { computeDomain } from "../../../common/entity/compute_domain";
import { stateActive } from "../../../common/entity/state_active";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-control-button";
import "../../../components/ha-control-button-group";
import { apiContext } from "../../../data/context";
import { UNAVAILABLE } from "../../../data/entity/entity";
import type { UpdateEntity } from "../../../data/update";
import { UpdateEntityFeature, updateIsInstalling } from "../../../data/update";
import { showUpdateBackupDialogParams } from "../../../dialogs/update_backup/show-update-backup-dialog";
import type { HomeAssistant, HomeAssistantApi } from "../../../types";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LovelaceCardFeatureContext,
  UpdateActionsCardFeatureConfig,
} from "./types";

export const DEFAULT_UPDATE_BACKUP_OPTION = "no";

const supportsUpdateActionsCardFeatureFromState = (stateObj: HassEntity) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "update" &&
    supportsFeature(stateObj, UpdateEntityFeature.INSTALL)
  );
};

export const supportsUpdateActionsCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsUpdateActionsCardFeatureFromState(stateObj);
};

@customElement("hui-update-actions-card-feature")
class HuiUpdateActionsCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state()
  @consumeEntityState({ entityIdPath: ["context", "entity_id"] })
  private _stateObj?: UpdateEntity;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @state() private _config?: UpdateActionsCardFeatureConfig;

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-update-actions-card-feature-editor");
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
    const stateObj = this._stateObj as UpdateEntity;

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
    const stateObj = this._stateObj as UpdateEntity;

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
      this._stateObj!,
      UpdateEntityFeature.BACKUP
    );
    let backup = supportsBackup && this._config?.backup === "yes";

    if (supportsBackup && this._config?.backup === "ask") {
      const response = await showUpdateBackupDialogParams(this, {});
      if (response === null) return;
      backup = response;
    }

    this._api.callService("update", "install", {
      entity_id: this._stateObj!.entity_id,
      backup: backup,
    });
  }

  private async _skip(): Promise<void> {
    this._api.callService("update", "skip", {
      entity_id: this._stateObj!.entity_id,
    });
  }

  protected render() {
    if (
      !this._config ||
      !this.context ||
      !this._stateObj ||
      !supportsUpdateActionsCardFeatureFromState(this._stateObj)
    ) {
      return nothing;
    }

    return html`
      <ha-control-button-group>
        <ha-control-button
          .label=${this._localize("ui.dialogs.more_info_control.update.skip")}
          @click=${this._skip}
          .disabled=${this._skipDisabled}
        >
          <ha-svg-icon .path=${mdiCancel}></ha-svg-icon>
        </ha-control-button>
        <ha-control-button
          .label=${this._localize(
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
    return cardFeatureStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-update-actions-card-feature": HuiUpdateActionsCardFeature;
  }
}
