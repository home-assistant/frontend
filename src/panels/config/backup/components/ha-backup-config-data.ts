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
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-expansion-panel";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import "../../../../components/ha-md-select";
import type { HaMdSelect } from "../../../../components/ha-md-select";
import "../../../../components/ha-md-select-option";
import "../../../../components/ha-switch";
import type { HaSwitch } from "../../../../components/ha-switch";
import { fetchHassioAddonsInfo } from "../../../../data/hassio/addon";
import type { HomeAssistant } from "../../../../types";
import "./ha-backup-addons-picker";
import type { BackupAddonItem } from "./ha-backup-addons-picker";

export type FormData = {
  homeassistant: boolean;
  database: boolean;
  media: boolean;
  share: boolean;
  addons_mode: "all" | "custom";
  addons: string[];
};

const INITIAL_FORM_DATA: FormData = {
  homeassistant: false,
  database: false,
  media: false,
  share: false,
  addons_mode: "all",
  addons: [],
};

export type BackupConfigData = {
  include_homeassistant?: boolean;
  include_database: boolean;
  include_folders?: string[];
  include_all_addons: boolean;
  include_addons?: string[];
};

const SELF_CREATED_ADDONS_FOLDER = "addons/local";
const SELF_CREATED_ADDONS_NAME = "___LOCAL_ADDONS___";

@customElement("ha-backup-config-data")
class HaBackupConfigData extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, attribute: "force-home-assistant" })
  public forceHomeAssistant = false;

  @state() private value?: BackupConfigData;

  @state() private _addons: BackupAddonItem[] = [];

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    if (isComponentLoaded(this.hass, "hassio")) {
      this._fetchAddons();
    }
  }

  private async _fetchAddons() {
    const { addons } = await fetchHassioAddonsInfo(this.hass);
    this._addons = [
      ...addons,
      {
        name: "Self created add-ons",
        slug: SELF_CREATED_ADDONS_NAME,
        iconPath: mdiFolder,
      },
    ];
  }

  private getData = memoizeOne((value?: BackupConfigData): FormData => {
    if (!value) {
      return INITIAL_FORM_DATA;
    }

    const config = value;

    const hasLocalAddonFolder = config.include_folders?.includes(
      SELF_CREATED_ADDONS_FOLDER
    );

    const addons = config.include_addons?.slice() ?? [];

    if (hasLocalAddonFolder && !value.include_all_addons) {
      addons.push(SELF_CREATED_ADDONS_NAME);
    }

    return {
      homeassistant: config.include_homeassistant || this.forceHomeAssistant,
      database: config.include_database,
      media: config.include_folders?.includes("media") || false,
      share: config.include_folders?.includes("share") || false,
      addons_mode: config.include_all_addons ? "all" : "custom",
      addons: addons,
    };
  });

  private setData(data: FormData) {
    const hasSelfCreatedAddons = data.addons.includes(SELF_CREATED_ADDONS_NAME);

    const include_folders = [
      ...(data.media ? ["media"] : []),
      ...(data.share ? ["share"] : []),
    ];

    let include_addons = data.addons_mode === "custom" ? data.addons : [];

    if (hasSelfCreatedAddons || data.addons_mode === "all") {
      include_folders.push(SELF_CREATED_ADDONS_FOLDER);
      include_addons = include_addons.filter(
        (addon) => addon !== SELF_CREATED_ADDONS_NAME
      );
    }

    this.value = {
      include_homeassistant: data.homeassistant || this.forceHomeAssistant,
      include_addons: include_addons.length ? include_addons : undefined,
      include_all_addons: data.addons_mode === "all",
      include_database: data.database,
      include_folders: include_folders.length ? include_folders : undefined,
    };

    fireEvent(this, "value-changed", { value: this.value });
  }

  protected render() {
    const data = this.getData(this.value);

    return html`
      <ha-md-list>
        <ha-md-list-item>
          <ha-svg-icon slot="start" .path=${mdiCog}></ha-svg-icon>
          <span slot="headline">
            ${this.forceHomeAssistant
              ? "Home Assistant settings are always included"
              : "Home Assistant settings"}
          </span>
          <span slot="supporting-text">
            The bare minimum needed to restore your system.
          </span>
          ${this.forceHomeAssistant
            ? html`<ha-button slot="end">Learn more</ha-button>`
            : html`
                <ha-switch
                  id="homeassistant"
                  slot="end"
                  @change=${this._switchChanged}
                  .checked=${data.homeassistant}
                ></ha-switch>
              `}
        </ha-md-list-item>

        <ha-md-list-item>
          <ha-svg-icon slot="start" .path=${mdiChartBox}></ha-svg-icon>
          <span slot="headline">History</span>
          <span slot="supporting-text">
            Historical data of your sensors, including your energy dashboard.
          </span>
          <ha-switch
            id="database"
            slot="end"
            @change=${this._switchChanged}
            .checked=${data.database}
          ></ha-switch>
        </ha-md-list-item>

        <ha-md-list-item>
          <ha-svg-icon slot="start" .path=${mdiPlayBoxMultiple}></ha-svg-icon>
          <span slot="headline">Media</span>
          <span slot="supporting-text">For example, camera recordings.</span>
          <ha-switch
            id="media"
            slot="end"
            @change=${this._switchChanged}
            .checked=${data.media}
          ></ha-switch>
        </ha-md-list-item>

        <ha-md-list-item>
          <ha-svg-icon slot="start" .path=${mdiFolder}></ha-svg-icon>
          <span slot="headline">Share folder</span>
          <span slot="supporting-text">
            Folder that is often used for advanced or older configurations.
          </span>
          <ha-switch
            id="share"
            slot="end"
            @change=${this._switchChanged}
            .checked=${data.share}
          ></ha-switch>
        </ha-md-list-item>

        ${this._addons.length
          ? html`
              <ha-md-list-item>
                <ha-svg-icon slot="start" .path=${mdiPuzzle}></ha-svg-icon>
                <span slot="headline">Add-ons</span>
                <span slot="supporting-text">
                  Select what add-ons you want to include.
                </span>
                <ha-md-select
                  slot="end"
                  id="addons_mode"
                  @change=${this._selectChanged}
                  .value=${data.addons_mode}
                >
                  <ha-md-select-option value="all">
                    <div slot="headline">All</div>
                  </ha-md-select-option>
                  <ha-md-select-option value="custom">
                    <div slot="headline">Custom</div>
                  </ha-md-select-option>
                </ha-md-select>
              </ha-md-list-item>
            `
          : nothing}
      </ha-md-list>
      ${data.addons_mode === "custom" && this._addons.length
        ? html`
            <ha-expansion-panel .header=${"Add-ons"} outlined expanded>
              <ha-backup-addons-picker
                .hass=${this.hass}
                .value=${data.addons}
                @value-changed=${this._addonsChanged}
                .addons=${this._addons}
              ></ha-backup-addons-picker>
            </ha-expansion-panel>
          `
        : nothing}
    `;
  }

  private _switchChanged(ev: Event) {
    const target = ev.currentTarget as HaSwitch;
    const data = this.getData(this.value);
    this.setData({
      ...data,
      [target.id]: target.checked,
    });
    fireEvent(this, "value-changed", { value: this.value });
  }

  private _selectChanged(ev: Event) {
    const target = ev.currentTarget as HaMdSelect;
    const data = this.getData(this.value);
    this.setData({
      ...data,
      [target.id]: target.value,
    });
    fireEvent(this, "value-changed", { value: this.value });
  }

  private _addonsChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const addons = ev.detail.value;
    const data = this.getData(this.value);
    this.setData({
      ...data,
      addons,
    });
    fireEvent(this, "value-changed", { value: this.value });
  }

  static styles = css`
    ha-md-list {
      background: none;
      --md-list-item-leading-space: 0;
      --md-list-item-trailing-space: 0;
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
