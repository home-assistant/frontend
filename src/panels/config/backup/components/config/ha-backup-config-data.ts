import {
  mdiChartBox,
  mdiCog,
  mdiFolder,
  mdiPlayBoxMultiple,
  mdiPuzzle,
} from "@mdi/js";
import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../../../common/config/is_component_loaded";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-button";
import "../../../../../components/ha-expansion-panel";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-md-select";
import type { HaMdSelect } from "../../../../../components/ha-md-select";
import "../../../../../components/ha-md-select-option";
import "../../../../../components/ha-switch";
import type { HaSwitch } from "../../../../../components/ha-switch";
import { fetchHassioAddonsInfo } from "../../../../../data/hassio/addon";
import type { HomeAssistant } from "../../../../../types";
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

  protected firstUpdated(changedProperties: PropertyValues): void {
    super.firstUpdated(changedProperties);
    if (isComponentLoaded(this.hass, "hassio")) {
      this._fetchAddons();
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

  private _hasLocalAddons(addons: BackupAddonItem[]): boolean {
    return addons.some((addon) => addon.slug === "local");
  }

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

        <ha-md-list-item>
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
        </ha-md-list-item>

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
                          "ui.panel.config.backup.data.local_addons"
                        )}
                      </span>
                      <span slot="supporting-text">
                        ${this.hass.localize(
                          "ui.panel.config.backup.data.local_addons_description"
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
                          "ui.panel.config.backup.data.addons"
                        )}
                      </span>
                      <span slot="supporting-text">
                        ${this.hass.localize(
                          "ui.panel.config.backup.data.addons_description"
                        )}
                      </span>
                      <ha-md-select
                        slot="end"
                        id="addons_mode"
                        @change=${this._selectChanged}
                        .value=${data.addons_mode}
                      >
                        <ha-md-select-option value="all">
                          <div slot="headline">
                            ${this.hass.localize(
                              "ui.panel.config.backup.data.addons_all"
                            )}
                          </div>
                        </ha-md-select-option>
                        <ha-md-select-option value="none">
                          <div slot="headline">
                            ${this.hass.localize(
                              "ui.panel.config.backup.data.addons_none"
                            )}
                          </div>
                        </ha-md-select-option>
                        <ha-md-select-option value="custom">
                          <div slot="headline">
                            ${this.hass.localize(
                              "ui.panel.config.backup.data.addons_custom"
                            )}
                          </div>
                        </ha-md-select-option>
                      </ha-md-select>
                    </ha-md-list-item>
                  `
                : nothing}
            `
          : nothing}
      </ha-md-list>
      ${isHassio && this._showAddons && this._addons.length
        ? html`
            <ha-expansion-panel .header=${"Add-ons"} outlined expanded>
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

  private _selectChanged(ev: Event) {
    const target = ev.currentTarget as HaMdSelect;
    const data = this._getData(this.value, this._showAddons);
    this._setData({
      ...data,
      [target.id]: target.value,
    });
    if (target.id === "addons_mode") {
      this._showAddons = target.value === "custom";
    }
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

  static styles = css`
    ha-md-list {
      background: none;
      --md-list-item-leading-space: 0;
      --md-list-item-trailing-space: 0;
    }
    ha-md-list-item {
      --md-item-overflow: visible;
    }
    ha-md-select {
      min-width: 210px;
    }
    @media all and (max-width: 450px) {
      ha-md-select {
        min-width: 160px;
        width: 160px;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-config-data": HaBackupConfigData;
  }
}
