import {
  mdiChartBox,
  mdiCog,
  mdiFolder,
  mdiInformation,
  mdiPlayBoxMultiple,
  mdiPuzzle,
} from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../../../common/config/is_component_loaded";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import "../../../../../components/ha-expansion-panel";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-select";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-switch";
import type { HaSwitch } from "../../../../../components/ha-switch";
import "../../../../../components/ha-tooltip";
import { fetchHassioAddonsInfo } from "../../../../../data/hassio/addon";
import type { HostDisksUsage } from "../../../../../data/hassio/host";
import { fetchHostDisksUsage } from "../../../../../data/hassio/host";
import { getRecorderInfo } from "../../../../../data/recorder";
import type { HomeAssistant, ValueChangedEvent } from "../../../../../types";
import { bytesToString } from "../../../../../util/bytes-to-string";
import "../ha-backup-addons-picker";
import type { BackupAddonItem } from "../ha-backup-addons-picker";

export interface FormData {
  homeassistant: boolean;
  database: boolean;
  media: boolean;
  share: boolean;
  local_addons: boolean;
  addons_mode: "all" | "custom" | "none";
  addons: string[];
}

const INITIAL_FORM_DATA: FormData = {
  homeassistant: false,
  database: false,
  media: false,
  share: false,
  local_addons: false,
  addons_mode: "all",
  addons: [],
};

export interface BackupConfigData {
  include_homeassistant?: boolean;
  include_database: boolean;
  include_folders?: string[];
  include_all_addons: boolean;
  include_addons?: string[];
}

declare global {
  interface HASSDomEvents {
    "backup-addons-fetched": undefined;
  }
}

@customElement("ha-backup-config-data")
class HaBackupConfigData extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, attribute: "force-home-assistant" })
  public forceHomeAssistant = false;

  @property({ attribute: "hide-addon-version", type: Boolean })
  public hideAddonVersion = false;

  @state() private value?: BackupConfigData;

  @state() private _addons: BackupAddonItem[] = [];

  @state() private _showAddons = false;

  @state() private _showDbOption = true;

  @state() private _storageInfo?: HostDisksUsage | null;

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    this._checkDbOption();
    if (isComponentLoaded(this.hass, "hassio")) {
      this._fetchAddons();
      this._fetchStorageInfo();
    }
  }

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has("value")) {
      if (isComponentLoaded(this.hass, "hassio")) {
        if (this.value?.include_addons?.length) {
          this._showAddons = true;
        }
      }
    }
  }

  private async _fetchAddons() {
    const { addons } = await fetchHassioAddonsInfo(this.hass);
    this._addons = addons;
    fireEvent(this, "backup-addons-fetched");
  }

  private async _checkDbOption() {
    if (isComponentLoaded(this.hass, "recorder")) {
      const info = await getRecorderInfo(this.hass.connection);
      this._showDbOption = info.db_in_default_location;
      if (!this._showDbOption && this.value?.include_database) {
        this.value.include_database = false;
      }
    } else {
      this._showDbOption = false;
    }
  }

  private async _fetchStorageInfo() {
    try {
      this._storageInfo = await fetchHostDisksUsage(this.hass);
    } catch (_err: any) {
      this._storageInfo = null;
    }
  }

  private _hasLocalAddons(addons: BackupAddonItem[]): boolean {
    return addons.some((addon) => addon.slug === "local");
  }

  private _estimateBackupSize = memoizeOne(
    (
      data: FormData,
      storageInfo: HostDisksUsage | null | undefined,
      addonsLength: number
    ): {
      compressedBytes: number;
      addonsNotAccurate: boolean;
    } | null => {
      if (!storageInfo?.children) {
        return null;
      }

      let totalBytes = 0;

      const segments: Record<string, number> = {};
      storageInfo.children.forEach((child) => {
        segments[child.id] = child.used_bytes;
      });

      if (data.homeassistant) {
        totalBytes += segments.homeassistant ?? 0;
      }
      if (data.media) {
        totalBytes += segments.media ?? 0;
      }
      if (data.share) {
        totalBytes += segments.share ?? 0;
      }

      if (
        data.addons_mode === "all" ||
        (data.addons_mode === "custom" && data.addons.length > 0)
      ) {
        // It would be better if we could receive individual app sizes in the WS request instead
        totalBytes +=
          (segments.addons_data ?? 0) + (segments.addons_config ?? 0);
      }

      return {
        // Estimate compressed size (40% reduction typical for gzip)
        compressedBytes: Math.round(totalBytes * 0.6),
        addonsNotAccurate:
          data.addons_mode === "custom" &&
          data.addons.length > 0 &&
          data.addons.length !== addonsLength,
      };
    }
  );

  private _getData = memoizeOne(
    (value: BackupConfigData | undefined, showAddon: boolean): FormData => {
      if (!value) {
        return INITIAL_FORM_DATA;
      }

      const config = value;

      const addons = config.include_addons?.slice() ?? [];

      return {
        homeassistant: config.include_homeassistant || this.forceHomeAssistant,
        database: config.include_database,
        media: config.include_folders?.includes("media") || false,
        share: config.include_folders?.includes("share") || false,
        local_addons: config.include_folders?.includes("addons/local") || false,
        addons_mode: config.include_all_addons
          ? "all"
          : addons.length > 0 || showAddon
            ? "custom"
            : "none",
        addons: addons,
      };
    }
  );

  private _setData(data: FormData) {
    const include_folders = [
      ...(data.media ? ["media"] : []),
      ...(data.share ? ["share"] : []),
      ...(data.local_addons ? ["addons/local"] : []),
    ];

    const include_addons = data.addons_mode === "custom" ? data.addons : [];

    this.value = {
      include_homeassistant:
        data.homeassistant || data.database || this.forceHomeAssistant,
      include_addons: include_addons.length ? include_addons : undefined,
      include_all_addons: data.addons_mode === "all",
      include_database: data.database,
      include_folders: include_folders.length ? include_folders : undefined,
    };

    fireEvent(this, "value-changed", { value: this.value });
  }

  protected render() {
    const data = this._getData(this.value, this._showAddons);

    const isHassio = isComponentLoaded(this.hass, "hassio");

    return html`
      ${this._renderSizeEstimate()}
      <ha-md-list>
        <ha-md-list-item>
          <ha-svg-icon slot="start" .path=${mdiCog}></ha-svg-icon>
          <span slot="headline">
            ${this.hass.localize("ui.panel.config.backup.data.ha_settings")}
          </span>
          <span slot="supporting-text">
            ${this.forceHomeAssistant
              ? this.hass.localize(
                  "ui.panel.config.backup.data.ha_settings_included_description"
                )
              : this.hass.localize(
                  "ui.panel.config.backup.data.ha_settings_description"
                )}
          </span>
          <ha-switch
            id="homeassistant"
            slot="end"
            @change=${this._switchChanged}
            .checked=${data.homeassistant}
            .disabled=${this.forceHomeAssistant || data.database}
          ></ha-switch>
        </ha-md-list-item>

        ${this._showDbOption
          ? html`<ha-md-list-item>
              <ha-svg-icon slot="start" .path=${mdiChartBox}></ha-svg-icon>
              <span slot="headline">
                ${this.hass.localize("ui.panel.config.backup.data.history")}
              </span>
              <span slot="supporting-text">
                ${this.hass.localize(
                  "ui.panel.config.backup.data.history_description"
                )}
              </span>
              <ha-switch
                id="database"
                slot="end"
                @change=${this._switchChanged}
                .checked=${data.database}
              ></ha-switch>
            </ha-md-list-item>`
          : nothing}
        ${isHassio
          ? html`
              <ha-md-list-item>
                <ha-svg-icon
                  slot="start"
                  .path=${mdiPlayBoxMultiple}
                ></ha-svg-icon>
                <span slot="headline">
                  ${this.hass.localize("ui.panel.config.backup.data.media")}
                </span>
                <span slot="supporting-text">
                  ${this.hass.localize(
                    "ui.panel.config.backup.data.media_description"
                  )}
                </span>
                <ha-switch
                  id="media"
                  slot="end"
                  @change=${this._switchChanged}
                  .checked=${data.media}
                ></ha-switch>
              </ha-md-list-item>

              <ha-md-list-item>
                <ha-svg-icon slot="start" .path=${mdiFolder}></ha-svg-icon>
                <span slot="headline">
                  ${this.hass.localize(
                    "ui.panel.config.backup.data.share_folder"
                  )}
                </span>
                <span slot="supporting-text">
                  ${this.hass.localize(
                    "ui.panel.config.backup.data.share_folder_description"
                  )}
                </span>
                <ha-switch
                  id="share"
                  slot="end"
                  @change=${this._switchChanged}
                  .checked=${data.share}
                ></ha-switch>
              </ha-md-list-item>

              ${this._hasLocalAddons(this._addons)
                ? html`
                    <ha-md-list-item>
                      <ha-svg-icon
                        slot="start"
                        .path=${mdiFolder}
                      ></ha-svg-icon>
                      <span slot="headline">
                        ${this.hass.localize(
                          "ui.panel.config.backup.data.local_apps"
                        )}
                      </span>
                      <span slot="supporting-text">
                        ${this.hass.localize(
                          "ui.panel.config.backup.data.local_apps_description"
                        )}
                      </span>
                      <ha-switch
                        id="local_addons"
                        slot="end"
                        @change=${this._switchChanged}
                        .checked=${data.local_addons}
                      ></ha-switch>
                    </ha-md-list-item>
                  `
                : nothing}
              ${this._addons.length
                ? html`
                    <ha-md-list-item>
                      <ha-svg-icon
                        slot="start"
                        .path=${mdiPuzzle}
                      ></ha-svg-icon>
                      <span slot="headline">
                        ${this.hass.localize(
                          "ui.panel.config.backup.data.apps"
                        )}
                      </span>
                      <span slot="supporting-text">
                        ${this.hass.localize(
                          "ui.panel.config.backup.data.apps_description"
                        )}
                      </span>
                      <ha-select
                        slot="end"
                        @selected=${this._selectChanged}
                        .value=${data.addons_mode}
                        .options=${[
                          {
                            value: "all",
                            label: this.hass.localize(
                              "ui.panel.config.backup.data.apps_all"
                            ),
                          },
                          {
                            value: "none",
                            label: this.hass.localize(
                              "ui.panel.config.backup.data.apps_none"
                            ),
                          },
                          {
                            value: "custom",
                            label: this.hass.localize(
                              "ui.panel.config.backup.data.apps_custom"
                            ),
                          },
                        ]}
                      ></ha-select>
                    </ha-md-list-item>
                  `
                : nothing}
            `
          : nothing}
      </ha-md-list>
      ${isHassio && this._showAddons && this._addons.length
        ? html`
            <ha-expansion-panel
              .header=${this.hass.localize("ui.panel.config.backup.data.apps")}
              outlined
              expanded
            >
              <ha-backup-addons-picker
                .hass=${this.hass}
                .value=${data.addons}
                @value-changed=${this._addonsChanged}
                .addons=${this._addons}
                .hideVersion=${this.hideAddonVersion}
              ></ha-backup-addons-picker>
            </ha-expansion-panel>
          `
        : nothing}
    `;
  }

  private _switchChanged(ev: Event) {
    const target = ev.currentTarget as HaSwitch;
    const data = this._getData(this.value, this._showAddons);
    this._setData({
      ...data,
      [target.id]: target.checked,
    });
  }

  private _selectChanged(
    ev: ValueChangedEvent<"all" | "none" | "custom" | undefined>
  ) {
    const value = ev.detail.value;

    if (!value) {
      return;
    }
    const data = this._getData(this.value, this._showAddons);

    this._setData({
      ...data,
      addons_mode: value,
    });
    this._showAddons = value === "custom";
  }

  private _addonsChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const addons = ev.detail.value;
    const data = this._getData(this.value, this._showAddons);
    this._setData({
      ...data,
      addons,
    });
  }

  private _renderSizeEstimate() {
    if (!isComponentLoaded(this.hass, "hassio")) {
      return nothing;
    }

    const data = this._getData(this.value, this._showAddons);

    if (
      !(
        data.homeassistant ||
        data.database ||
        data.media ||
        data.share ||
        data.local_addons ||
        data.addons_mode === "all" ||
        (data.addons_mode === "custom" && data.addons.length > 0)
      )
    ) {
      return nothing;
    }

    if (this._storageInfo === undefined) {
      return html`
        <ha-alert alert-type="info">
          <ha-spinner slot="icon"></ha-spinner>
          ${this.hass.localize(
            "ui.panel.config.backup.data.estimated_size_loading"
          )}
        </ha-alert>
      `;
    }

    if (!this._storageInfo || !this._storageInfo.children) {
      return nothing;
    }

    const result = this._estimateBackupSize(
      data,
      this._storageInfo,
      this._addons.length
    );
    if (result === null) {
      return nothing;
    }

    const { compressedBytes, addonsNotAccurate } = result;

    return html`
      <span class="estimated-size">
        <span class="estimated-size-heading">
          ${this.hass.localize("ui.panel.config.backup.data.estimated_size")}
          <ha-svg-icon
            id="estimated-size-info"
            .path=${mdiInformation}
          ></ha-svg-icon>
          <ha-tooltip for="estimated-size-info" placement="right">
            ${this.hass.localize(
              "ui.panel.config.backup.data.estimated_size_disclaimer"
            )}
            ${addonsNotAccurate
              ? html`<br /><br />${this.hass.localize(
                    "ui.panel.config.backup.data.estimated_size_disclaimer_apps_custom"
                  )}`
              : nothing}
          </ha-tooltip>
        </span>
        <span class="estimated-size-value">
          ${bytesToString(compressedBytes)}
        </span>
      </span>
    `;
  }

  static styles = css`
    .estimated-size {
      display: block;
      margin-top: var(--ha-space-2);
      font-size: var(--ha-font-size-m);
    }
    .estimated-size-heading {
      font-size: var(--ha-font-size-m);
      line-height: var(--ha-line-height-expanded);
    }
    .estimated-size-heading ha-svg-icon {
      --mdc-icon-size: 16px;
      color: var(--secondary-text-color);
      margin-inline-start: var(--ha-space-1);
      vertical-align: middle;
    }
    .estimated-size-value {
      display: block;
      font-size: var(--ha-font-size-s);
      color: var(--secondary-text-color);
    }
    ha-spinner {
      --ha-spinner-size: 24px;
    }
    ha-md-list {
      background: none;
      --md-list-item-leading-space: 0;
      --md-list-item-trailing-space: 0;
    }
    ha-md-list-item {
      --md-item-overflow: visible;
    }
    ha-select {
      min-width: 210px;
    }
    @media all and (max-width: 450px) {
      ha-select {
        min-width: 140px;
        width: 140px;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-config-data": HaBackupConfigData;
  }
}
