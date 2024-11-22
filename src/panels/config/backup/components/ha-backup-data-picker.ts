import {
  mdiChartBox,
  mdiCog,
  mdiFolder,
  mdiPlayBoxMultiple,
  mdiPuzzle,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import { fireEvent } from "../../../../common/dom/fire_event";
import { capitalizeFirstLetter } from "../../../../common/string/capitalize-first-letter";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-checkbox";
import type { HaCheckbox } from "../../../../components/ha-checkbox";
import "../../../../components/ha-formfield";
import "../../../../components/ha-svg-icon";
import type { BackupData } from "../../../../data/backup";
import type { HassioAddonInfo } from "../../../../data/hassio/addon";
import { fetchHassioAddonsInfo } from "../../../../data/hassio/addon";
import { mdiHomeAssistant } from "../../../../resources/home-assistant-logo-svg";
import type { HomeAssistant } from "../../../../types";
import "./ha-backup-addons-picker";
import type { BackupAddon } from "./ha-backup-addons-picker";
import "./ha-backup-formfield-label";

type CheckBoxItem = {
  label: string;
  id: string;
  version?: string;
};

const SELF_CREATED_ADDONS_FOLDER = "addons/local";

const ITEM_ICONS = {
  config: mdiCog,
  database: mdiChartBox,
  media: mdiPlayBoxMultiple,
  share: mdiFolder,
};

type SelectedItems = {
  homeassistant: string[];
  addons: string[];
};

@customElement("ha-backup-data-picker")
export class HaBackupDataPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data!: BackupData;

  @property({ attribute: false }) public value?: BackupData;

  @state() private _addonsInfo!: Record<string, HassioAddonInfo>;

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    if (isComponentLoaded(this.hass, "hassio")) {
      this._fetchAddonsInfo();
    }
  }

  private _fetchAddonsInfo = async () => {
    const info = await fetchHassioAddonsInfo(this.hass);
    this._addonsInfo = info.addons.reduce(
      (acc, addon) => ({
        ...acc,
        [addon.slug]: addon,
      }),
      {}
    );
  };

  private _homeAssistantItems = memoizeOne(
    (data: BackupData, _localize: LocalizeFunc) => {
      const items: CheckBoxItem[] = [];

      if (data.homeassistant_included) {
        items.push({
          label: "Settings",
          id: "config",
          version: data.homeassistant_version,
        });
      }
      if (data.database_included) {
        items.push({
          label: "History",
          id: "database",
        });
      }
      // Filter out the local add-ons folder
      const folders = data.folders.filter(
        (folder) => folder !== SELF_CREATED_ADDONS_FOLDER
      );
      items.push(
        ...folders.map<CheckBoxItem>((folder) => ({
          label: capitalizeFirstLetter(folder),
          id: folder,
        }))
      );
      return items;
    }
  );

  private _addonsItems = memoizeOne(
    (
      data: BackupData,
      _localize: LocalizeFunc,
      addonInfo?: Record<string, HassioAddonInfo>
    ) => {
      const items = data.addons.map<BackupAddon>((addon) => ({
        name: addon.name,
        slug: addon.slug,
        version: addon.version,
        icon: addonInfo?.[addon.slug]?.icon,
      }));

      // Add local add-ons folder in addons items
      if (data.folders.includes("addons/local")) {
        items.push({
          name: "Self created add-ons",
          slug: SELF_CREATED_ADDONS_FOLDER,
        });
      }

      return items;
    }
  );

  private _parseValue = memoizeOne((value?: BackupData): SelectedItems => {
    if (!value) {
      return {
        homeassistant: [],
        addons: [],
      };
    }
    const homeassistant: string[] = [];
    const addons: string[] = [];

    if (value.homeassistant_included) {
      homeassistant.push("config");
    }
    if (value.database_included) {
      homeassistant.push("database");
    }

    let folders = [...value.folders];
    const addonsList = value.addons.map((addon) => addon.slug);
    if (folders.includes(SELF_CREATED_ADDONS_FOLDER)) {
      folders = folders.filter((f) => f !== SELF_CREATED_ADDONS_FOLDER);
      addonsList.push(SELF_CREATED_ADDONS_FOLDER);
    }
    homeassistant.push(...folders);
    addons.push(...addonsList);

    return {
      homeassistant,
      addons,
    };
  });

  private _formatValue = memoizeOne(
    (selectedItems: SelectedItems, data: BackupData): BackupData => ({
      homeassistant_version: data.homeassistant_version,
      homeassistant_included: selectedItems.homeassistant.includes("config"),
      database_included: selectedItems.homeassistant.includes("database"),
      addons: data.addons.filter((addon) =>
        selectedItems.addons.includes(addon.slug)
      ),
      folders: data.folders.filter(
        (folder) =>
          selectedItems.homeassistant.includes(folder) ||
          (selectedItems.addons.includes(folder) &&
            folder === SELF_CREATED_ADDONS_FOLDER)
      ),
    })
  );

  private _itemChanged(ev: Event) {
    const itemValues = this._parseValue(this.value);

    const checkbox = ev.currentTarget as HaCheckbox;
    const section = (checkbox as any).section;
    if (checkbox.checked) {
      itemValues[section].push(checkbox.id);
    } else {
      itemValues[section] = itemValues[section].filter(
        (id) => id !== checkbox.id
      );
    }

    const newValue = this._formatValue(itemValues, this.data);
    fireEvent(this, "value-changed", { value: newValue });
  }

  private _addonsChanged(ev: CustomEvent) {
    ev.stopPropagation();
    const itemValues = this._parseValue(this.value);

    const addons = ev.detail.value;
    itemValues.addons = addons;

    const newValue = this._formatValue(itemValues, this.data);
    fireEvent(this, "value-changed", { value: newValue });
  }

  private _sectionChanged(ev: Event) {
    const itemValues = this._parseValue(this.value);
    const allValues = this._parseValue(this.data);

    const checkbox = ev.currentTarget as HaCheckbox;
    const id = checkbox.id;
    if (checkbox.checked) {
      itemValues[id] = allValues[id];
    } else {
      itemValues[id] = [];
    }

    const newValue = this._formatValue(itemValues, this.data);
    fireEvent(this, "value-changed", { value: newValue });
  }

  protected render() {
    const homeAssistantItems = this._homeAssistantItems(
      this.data,
      this.hass.localize
    );

    const addonsItems = this._addonsItems(
      this.data,
      this.hass.localize,
      this._addonsInfo
    );

    const selectedItems = this._parseValue(this.value);

    return html`
      ${homeAssistantItems.length
        ? html`
            <div class="section">
              <ha-formfield>
                <ha-backup-formfield-label
                  slot="label"
                  .label=${"Home Assistant"}
                  .iconPath=${mdiHomeAssistant}
                >
                </ha-backup-formfield-label>
                <ha-checkbox
                  .id=${"homeassistant"}
                  .checked=${selectedItems.homeassistant.length ===
                  homeAssistantItems.length}
                  .indeterminate=${selectedItems.homeassistant.length > 0 &&
                  selectedItems.homeassistant.length <
                    homeAssistantItems.length}
                  @change=${this._sectionChanged}
                ></ha-checkbox>
              </ha-formfield>
              <div class="items">
                ${homeAssistantItems.map(
                  (item) => html`
                    <ha-formfield>
                      <ha-backup-formfield-label
                        slot="label"
                        .label=${item.label}
                        .version=${item.version}
                        .iconPath=${ITEM_ICONS[item.id] || mdiFolder}
                      >
                      </ha-backup-formfield-label>
                      <ha-checkbox
                        .id=${item.id}
                        .checked=${selectedItems.homeassistant.includes(
                          item.id
                        )}
                        .section=${"homeassistant"}
                        @change=${this._itemChanged}
                      ></ha-checkbox>
                    </ha-formfield>
                  `
                )}
              </div>
            </div>
          `
        : nothing}
      ${addonsItems.length
        ? html`
            <div class="section">
              <ha-formfield>
                <ha-backup-formfield-label
                  slot="label"
                  .label=${"Add-ons"}
                  .iconPath=${mdiPuzzle}
                >
                </ha-backup-formfield-label>
                <ha-checkbox
                  .id=${"addons"}
                  .checked=${selectedItems.addons.length === addonsItems.length}
                  .indeterminate=${selectedItems.addons.length > 0 &&
                  selectedItems.addons.length < addonsItems.length}
                  @change=${this._sectionChanged}
                ></ha-checkbox>
              </ha-formfield>
              <ha-backup-addons-picker
                .hass=${this.hass}
                .value=${selectedItems.addons}
                @value-changed=${this._addonsChanged}
                .addons=${addonsItems}
              >
              </ha-backup-addons-picker>
            </div>
          `
        : nothing}
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      .section {
        margin-inline-start: -16px;
        margin-inline-end: 0;
        margin-left: -16px;
      }
      .items {
        padding-inline-start: 40px;
        padding-inline-end: 0;
        padding-left: 40px;
        display: flex;
        flex-direction: column;
      }
      ha-backup-addons-picker {
        display: block;
        padding-inline-start: 40px;
        padding-inline-end: 0;
        padding-left: 40px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-data-picker": HaBackupDataPicker;
  }
}
