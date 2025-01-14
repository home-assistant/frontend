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
import { capitalizeFirstLetter } from "../../../../common/string/capitalize-first-letter";
import type { LocalizeFunc } from "../../../../common/translations/localize";
import "../../../../components/ha-checkbox";
import type { HaCheckbox } from "../../../../components/ha-checkbox";
import "../../../../components/ha-formfield";
import "../../../../components/ha-svg-icon";
import type { BackupData } from "../../../../data/backup";
import { fetchHassioAddonsInfo } from "../../../../data/hassio/addon";
import { mdiHomeAssistant } from "../../../../resources/home-assistant-logo-svg";
import type { HomeAssistant } from "../../../../types";
import "./ha-backup-addons-picker";
import type { BackupAddonItem } from "./ha-backup-addons-picker";
import "./ha-backup-formfield-label";

interface CheckBoxItem {
  label: string;
  id: string;
  version?: string;
}

const ITEM_ICONS = {
  config: mdiCog,
  database: mdiChartBox,
  media: mdiPlayBoxMultiple,
  share: mdiFolder,
};

interface SelectedItems {
  homeassistant: string[];
  addons: string[];
}

@customElement("ha-backup-data-picker")
export class HaBackupDataPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public data!: BackupData;

  @property({ attribute: false }) public value?: BackupData;

  @state() public _addonIcons: Record<string, boolean> = {};

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    if (isComponentLoaded(this.hass, "hassio")) {
      this._fetchAddonInfo();
    }
  }

  private async _fetchAddonInfo() {
    const { addons } = await fetchHassioAddonsInfo(this.hass);
    this._addonIcons = addons.reduce<Record<string, boolean>>(
      (acc, addon) => ({
        ...acc,
        [addon.slug]: addon.icon,
      }),
      {}
    );
  }

  private _homeAssistantItems = memoizeOne(
    (data: BackupData, _localize: LocalizeFunc) => {
      const items: CheckBoxItem[] = [];

      if (data.homeassistant_included) {
        items.push({
          label: data.database_included
            ? this.hass.localize(
                "ui.panel.config.backup.data_picker.settings_and_history"
              )
            : this.hass.localize("ui.panel.config.backup.data_picker.settings"),
          id: "config",
          version: data.homeassistant_version,
        });
      }
      items.push(
        ...data.folders.map<CheckBoxItem>((folder) => ({
          label: this._localizeFolder(folder),
          id: folder,
        }))
      );
      return items;
    }
  );

  private _localizeFolder(folder: string): string {
    switch (folder) {
      case "media":
        return this.hass.localize("ui.panel.config.backup.data_picker.media");
      case "share":
        return this.hass.localize(
          "ui.panel.config.backup.data_picker.share_folder"
        );
      case "addons/local":
        return this.hass.localize(
          "ui.panel.config.backup.data_picker.local_addons"
        );
    }
    return capitalizeFirstLetter(folder);
  }

  private _addonsItems = memoizeOne(
    (
      data: BackupData,
      _localize: LocalizeFunc,
      addonIcons: Record<string, boolean>
    ) =>
      data.addons.map<BackupAddonItem>((addon) => ({
        name: addon.name,
        slug: addon.slug,
        version: addon.version,
        icon: addonIcons[addon.slug],
      }))
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

    const folders = value.folders;
    homeassistant.push(...folders);
    const addonsList = value.addons.map((addon) => addon.slug);
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
      database_included:
        data.database_included &&
        selectedItems.homeassistant.includes("config"),
      addons: data.addons.filter((addon) =>
        selectedItems.addons.includes(addon.slug)
      ),
      folders: data.folders.filter((folder) =>
        selectedItems.homeassistant.includes(folder)
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
      this._addonIcons
    );

    const selectedItems = this._parseValue(this.value);

    return html`
      ${homeAssistantItems.length
        ? html`
            <div class="section">
              <ha-formfield>
                <ha-backup-formfield-label
                  slot="label"
                  label="Home Assistant"
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
                  .label=${this.hass.localize(
                    "ui.panel.config.backup.data_picker.local_addons"
                  )}
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

  static styles = css`
    .section {
      margin-left: -16px;
      margin-inline-start: -16px;
      margin-inline-end: initial;
    }
    .items {
      padding-left: 40px;
      padding-inline-start: 40px;
      padding-inline-end: initial;
      display: flex;
      flex-direction: column;
    }
    ha-backup-addons-picker {
      display: block;
      padding-left: 40px;
      padding-inline-start: 40px;
      padding-inline-end: initial;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-data-picker": HaBackupDataPicker;
  }
}
