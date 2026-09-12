import "@home-assistant/webawesome/dist/components/skeleton/skeleton";
import { consume } from "@lit/context";
import type { HassConfig } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import { relativeTime } from "../../../../common/datetime/relative_time";
import { consumeLocalize } from "../../../../common/decorators/consume-context-entry";
import { transform } from "../../../../common/decorators/transform";
import { supportsFeature } from "../../../../common/entity/supports-feature";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/animation/ha-fade-in";
import "../../../../components/ha-switch";
import "../../../../components/item/ha-row-item";
import type { BackupConfig } from "../../../../data/backup";
import { fetchBackupConfig } from "../../../../data/backup";
import {
  apiContext,
  configContext,
  internationalizationContext,
  statesContext,
} from "../../../../data/context";
import type { EntitySources } from "../../../../data/entity/entity_sources";
import { fetchEntitySourcesWithCache } from "../../../../data/entity/entity_sources";
import { getSupervisorUpdateConfig } from "../../../../data/supervisor/update";
import type { FrontendLocaleData } from "../../../../data/translation";
import type { UpdateEntity, UpdateType } from "../../../../data/update";
import {
  getUpdateType,
  UpdateEntityFeature,
  updateIsInstalling,
} from "../../../../data/update";
import type {
  HomeAssistant,
  HomeAssistantApi,
  HomeAssistantConfig,
  HomeAssistantInternationalization,
} from "../../../../types";

@customElement("ha-more-info-update-backup")
export class HaMoreInfoUpdateBackup extends LitElement {
  @property({ attribute: false }) public stateObj?: UpdateEntity;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  @transform<HomeAssistantInternationalization, FrontendLocaleData>({
    transformer: ({ locale }) => locale,
  })
  private _locale!: FrontendLocaleData;

  @state() private _backupConfigLoading = true;

  @state() private _backupConfig?: BackupConfig;

  @state() private _createBackupLoading = true;

  @state() private _createBackup = false;

  @state() private _entitySources?: EntitySources;

  @consume({ context: apiContext, subscribe: true })
  private _api!: HomeAssistantApi;

  @consume({ context: statesContext, subscribe: true })
  private _states!: HomeAssistant["states"];

  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, HassConfig>({
    transformer: ({ config }) => config,
  })
  private _config!: HassConfig;

  public get createBackup(): boolean {
    if (
      !this.stateObj ||
      !supportsFeature(this.stateObj, UpdateEntityFeature.BACKUP)
    ) {
      return false;
    }
    return this._createBackup;
  }

  protected firstUpdated(): void {
    this._setupBackup();
  }

  protected render() {
    if (
      !this.stateObj ||
      !supportsFeature(this.stateObj, UpdateEntityFeature.BACKUP)
    ) {
      return nothing;
    }

    const createBackupTexts = this._computeCreateBackupTexts();

    if (!createBackupTexts && !this._backupConfigLoading) {
      return nothing;
    }

    return html`
      <ha-row-item
        .headline=${createBackupTexts ? createBackupTexts.title : undefined}
        .supportingText=${
          createBackupTexts ? createBackupTexts.description : undefined
        }
      >
        ${
          !createBackupTexts
            ? html`<ha-fade-in slot="headline" .delay=${500}
                ><wa-skeleton effect="sheen"></wa-skeleton
              ></ha-fade-in>`
            : nothing
        }
        ${
          this._createBackupLoading
            ? html`<ha-fade-in class="skeleton-end" slot="end" .delay=${500}
                ><wa-skeleton effect="sheen"></wa-skeleton
              ></ha-fade-in>`
            : html`<ha-switch
                slot="end"
                .checked=${this._createBackup}
                @change=${this._createBackupChanged}
                .disabled=${updateIsInstalling(this.stateObj)}
              ></ha-switch>`
        }
      </ha-row-item>
    `;
  }

  private async _setupBackup(): Promise<void> {
    if (!supportsFeature(this.stateObj!, UpdateEntityFeature.BACKUP)) {
      this._createBackupLoading = false;
      this._backupConfigLoading = false;
      return;
    }

    try {
      this._entitySources = await fetchEntitySourcesWithCache({
        callWS: this._api.callWS,
        states: this._states,
      });
      const type = getUpdateType(this.stateObj!, this._entitySources!);

      const requests: Promise<any>[] = [];
      if (
        isComponentLoaded(this._config, "hassio") &&
        ["addon", "home_assistant", "home_assistant_os"].includes(type)
      ) {
        requests.push(this._fetchUpdateBackupConfig(type));
      }

      if (this._isHaOrOsUpdate(type)) {
        requests.push(this._fetchBackupConfig());
      }

      const results = await Promise.allSettled(requests);
      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length) {
        throw failures[0].reason;
      }
    } catch (err) {
      // ignore error, because the generic backup option remains available
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      this._createBackupLoading = false;
      this._backupConfigLoading = false;
    }
  }

  private async _fetchUpdateBackupConfig(type: UpdateType) {
    try {
      const config = await getSupervisorUpdateConfig(this._api);

      // for home assistant and OS updates
      if (this._isHaOrOsUpdate(type)) {
        this._createBackup = config.core_backup_before_update;
        return;
      }

      if (type === "addon") {
        this._createBackup = config.add_on_backup_before_update;
      }
    } catch (err) {
      // ignore error, because user can still set the config
      // eslint-disable-next-line no-console
      console.error(err);
      this._createBackup = false;
    }
  }

  private async _fetchBackupConfig(): Promise<void> {
    const { config } = await fetchBackupConfig(this._api);
    this._backupConfig = config;
  }

  private _isHaOrOsUpdate(type: UpdateType): boolean {
    return ["home_assistant", "home_assistant_os"].includes(type);
  }

  private _computeCreateBackupTexts():
    { title: string; description?: string } | undefined {
    const updateType = this._entitySources
      ? getUpdateType(this.stateObj!, this._entitySources)
      : "generic";

    if (this._isHaOrOsUpdate(updateType)) {
      if (this._backupConfigLoading) {
        return undefined;
      }

      const isBackupConfigValid =
        !!this._backupConfig &&
        !!this._backupConfig.automatic_backups_configured &&
        !!this._backupConfig.create_backup.password &&
        this._backupConfig.create_backup.agent_ids.length > 0;

      if (!isBackupConfigValid) {
        return {
          title: this._localize(
            "ui.dialogs.more_info_control.update.create_backup.manual"
          ),
          description: this._localize(
            "ui.dialogs.more_info_control.update.create_backup.manual_description"
          ),
        };
      }

      const lastAutomaticBackupDate = this._backupConfig
        ?.last_completed_automatic_backup
        ? new Date(this._backupConfig?.last_completed_automatic_backup)
        : null;
      const now = new Date();

      return {
        title: this._localize(
          "ui.dialogs.more_info_control.update.create_backup.automatic"
        ),
        description: lastAutomaticBackupDate
          ? this._localize(
              "ui.dialogs.more_info_control.update.create_backup.automatic_description_last",
              {
                relative_time: relativeTime(
                  lastAutomaticBackupDate,
                  this._locale,
                  now,
                  true
                ),
              }
            )
          : this._localize(
              "ui.dialogs.more_info_control.update.create_backup.automatic_description_none"
            ),
      };
    }

    // App backup
    if (updateType === "addon") {
      const version = this.stateObj!.attributes.installed_version;
      return {
        title: this._localize(
          "ui.dialogs.more_info_control.update.create_backup.app"
        ),
        description: version
          ? this._localize(
              "ui.dialogs.more_info_control.update.create_backup.app_description",
              { version: version }
            )
          : undefined,
      };
    }

    // Fallback to generic UI
    return {
      title: this._localize(
        "ui.dialogs.more_info_control.update.create_backup.generic"
      ),
    };
  }

  private _createBackupChanged(ev) {
    this._createBackup = ev.target.checked;
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }
    ha-row-item {
      width: 100%;
      --ha-row-item-padding-inline: var(--ha-space-6);
    }
    .skeleton-end {
      width: 48px;
      height: 24px;
      display: block;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-update-backup": HaMoreInfoUpdateBackup;
  }
}
