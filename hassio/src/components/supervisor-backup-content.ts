import { mdiFolder, mdiPuzzle } from "@mdi/js";
import "@polymer/paper-input/paper-input";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import {
  CSSResultGroup,
  LitElement,
  TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, query } from "lit/decorators";
import { atLeastVersion } from "../../../src/common/config/version";
import { formatDate } from "../../../src/common/datetime/format_date";
import { formatDateTime } from "../../../src/common/datetime/format_date_time";
import { LocalizeFunc } from "../../../src/common/translations/localize";
import "../../../src/components/ha-checkbox";
import "../../../src/components/ha-formfield";
import "../../../src/components/ha-radio";
import type { HaRadio } from "../../../src/components/ha-radio";
import {
  HassioBackupDetail,
  HassioFullBackupCreateParams,
  HassioPartialBackupCreateParams,
} from "../../../src/data/hassio/backup";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import { mdiHomeAssistant } from "../../../src/resources/home-assistant-logo-svg";
import {
  HomeAssistant,
  TranslationDict,
  ValueChangedEvent,
} from "../../../src/types";
import "./supervisor-formfield-label";

type BackupOrRestoreKey = keyof TranslationDict["supervisor"]["backup"] &
  keyof TranslationDict["ui"]["panel"]["page-onboarding"]["restore"];

interface CheckboxItem {
  slug: string;
  checked: boolean;
  name: string;
}

interface AddonCheckboxItem extends CheckboxItem {
  version: string;
}

const _computeFolders = (folders): CheckboxItem[] => {
  const list: CheckboxItem[] = [];
  if (folders.includes("ssl")) {
    list.push({ slug: "ssl", name: "SSL", checked: false });
  }
  if (folders.includes("share")) {
    list.push({ slug: "share", name: "Share", checked: false });
  }
  if (folders.includes("media")) {
    list.push({ slug: "media", name: "Media", checked: false });
  }
  if (folders.includes("addons/local")) {
    list.push({ slug: "addons/local", name: "Local add-ons", checked: false });
  }
  return list.sort((a, b) => (a.name > b.name ? 1 : -1));
};

const _computeAddons = (addons): AddonCheckboxItem[] =>
  addons
    .map((addon) => ({
      slug: addon.slug,
      name: addon.name,
      version: addon.version,
      checked: false,
    }))
    .sort((a, b) => (a.name > b.name ? 1 : -1));

@customElement("supervisor-backup-content")
export class SupervisorBackupContent extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public localize?: LocalizeFunc;

  @property({ attribute: false }) public supervisor?: Supervisor;

  @property({ attribute: false }) public backup?: HassioBackupDetail;

  @property() public backupType: HassioBackupDetail["type"] = "full";

  @property({ attribute: false }) public folders?: CheckboxItem[];

  @property({ attribute: false }) public addons?: AddonCheckboxItem[];

  @property({ type: Boolean }) public homeAssistant = false;

  @property({ type: Boolean }) public backupHasPassword = false;

  @property({ type: Boolean }) public onboarding = false;

  @property() public backupName = "";

  @property() public backupPassword = "";

  @property() public confirmBackupPassword = "";

  @query("paper-input, ha-radio, ha-checkbox", true) private _focusTarget;

  public willUpdate(changedProps) {
    super.willUpdate(changedProps);
    if (!this.hasUpdated) {
      this.folders = _computeFolders(
        this.backup
          ? this.backup.folders
          : ["ssl", "share", "media", "addons/local"]
      );
      this.addons = _computeAddons(
        this.backup ? this.backup.addons : this.supervisor?.addon.addons
      );
      this.backupType = this.backup?.type || "full";
      this.backupName = this.backup?.name || "";
      this.backupHasPassword = this.backup?.protected || false;
    }
  }

  public override focus() {
    this._focusTarget?.focus();
  }

  private _localize = (key: BackupOrRestoreKey) =>
    this.supervisor?.localize(`backup.${key}`) ||
    this.localize!(`ui.panel.page-onboarding.restore.${key}`);

  protected render() {
    if (!this.onboarding && !this.supervisor) {
      return nothing;
    }
    const foldersSection =
      this.backupType === "partial" ? this._getSection("folders") : undefined;
    const addonsSection =
      this.backupType === "partial" ? this._getSection("addons") : undefined;

    return html`
      ${this.backup
        ? html`<div class="details">
            ${this.backup.type === "full"
              ? this._localize("full_backup")
              : this._localize("partial_backup")}
            (${Math.ceil(this.backup.size * 10) / 10 + " MB"})<br />
            ${this.hass
              ? formatDateTime(
                  new Date(this.backup.date),
                  this.hass.locale,
                  this.hass.config
                )
              : this.backup.date}
          </div>`
        : html`<paper-input
            name="backupName"
            .label=${this._localize("name")}
            .value=${this.backupName}
            @value-changed=${this._handleTextValueChanged}
          >
          </paper-input>`}
      ${!this.backup || this.backup.type === "full"
        ? html`<div class="sub-header">
              ${!this.backup
                ? this._localize("type")
                : this._localize("select_type")}
            </div>
            <div class="backup-types">
              <ha-formfield .label=${this._localize("full_backup")}>
                <ha-radio
                  @change=${this._handleRadioValueChanged}
                  value="full"
                  name="backupType"
                  .checked=${this.backupType === "full"}
                >
                </ha-radio>
              </ha-formfield>
              <ha-formfield .label=${this._localize("partial_backup")}>
                <ha-radio
                  @change=${this._handleRadioValueChanged}
                  value="partial"
                  name="backupType"
                  .checked=${this.backupType === "partial"}
                >
                </ha-radio>
              </ha-formfield>
            </div>`
        : ""}
      ${this.backupType === "partial"
        ? html`<div class="partial-picker">
            ${!this.backup || this.backup.homeassistant
              ? html`<ha-formfield
                  .label=${html`<supervisor-formfield-label
                    label="Home Assistant"
                    .iconPath=${mdiHomeAssistant}
                    .version=${this.backup
                      ? this.backup.homeassistant
                      : this.hass.config.version}
                  >
                  </supervisor-formfield-label>`}
                >
                  <ha-checkbox
                    .checked=${this.homeAssistant}
                    @change=${this.toggleHomeAssistant}
                  >
                  </ha-checkbox>
                </ha-formfield>`
              : ""}
            ${foldersSection?.templates.length
              ? html`
                  <ha-formfield
                    .label=${html`<supervisor-formfield-label
                      .label=${this._localize("folders")}
                      .iconPath=${mdiFolder}
                    >
                    </supervisor-formfield-label>`}
                  >
                    <ha-checkbox
                      @change=${this._toggleSection}
                      .checked=${foldersSection.checked}
                      .indeterminate=${foldersSection.indeterminate}
                      .section=${"folders"}
                    >
                    </ha-checkbox>
                  </ha-formfield>
                  <div class="section-content">${foldersSection.templates}</div>
                `
              : ""}
            ${addonsSection?.templates.length
              ? html`
                  <ha-formfield
                    .label=${html`<supervisor-formfield-label
                      .label=${this._localize("addons")}
                      .iconPath=${mdiPuzzle}
                    >
                    </supervisor-formfield-label>`}
                  >
                    <ha-checkbox
                      @change=${this._toggleSection}
                      .checked=${addonsSection.checked}
                      .indeterminate=${addonsSection.indeterminate}
                      .section=${"addons"}
                    >
                    </ha-checkbox>
                  </ha-formfield>
                  <div class="section-content">${addonsSection.templates}</div>
                `
              : ""}
          </div> `
        : ""}
      ${this.backupType === "partial" &&
      (!this.backup || this.backupHasPassword)
        ? html`<hr />`
        : ""}
      ${!this.backup
        ? html`<ha-formfield
            class="password"
            .label=${this._localize("password_protection")}
          >
            <ha-checkbox
              .checked=${this.backupHasPassword}
              @change=${this._toggleHasPassword}
            >
            </ha-checkbox>
          </ha-formfield>`
        : ""}
      ${this.backupHasPassword
        ? html`
            <paper-input
              .label=${this._localize("password")}
              type="password"
              name="backupPassword"
              .value=${this.backupPassword}
              @value-changed=${this._handleTextValueChanged}
            >
            </paper-input>
            ${!this.backup
              ? html` <paper-input
                  .label=${this._localize("confirm_password")}
                  type="password"
                  name="confirmBackupPassword"
                  .value=${this.confirmBackupPassword}
                  @value-changed=${this._handleTextValueChanged}
                >
                </paper-input>`
              : ""}
          `
        : ""}
    `;
  }

  private toggleHomeAssistant() {
    this.homeAssistant = !this.homeAssistant;
  }

  static get styles(): CSSResultGroup {
    return css`
      .partial-picker ha-formfield {
        display: block;
      }
      .partial-picker ha-checkbox {
        --mdc-checkbox-touch-target-size: 32px;
      }
      .partial-picker {
        display: block;
        margin: 0px -6px;
      }
      supervisor-formfield-label {
        display: inline-flex;
        align-items: center;
      }
      hr {
        border-color: var(--divider-color);
        border-bottom: none;
        margin: 16px 0;
      }
      .details {
        color: var(--secondary-text-color);
      }
      .section-content {
        display: flex;
        flex-direction: column;
        margin-left: 30px;
      }
      ha-formfield.password {
        display: block;
        margin: 0 -14px -16px;
      }
      .backup-types {
        display: flex;
        margin-left: -13px;
      }
      .sub-header {
        margin-top: 8px;
      }
    `;
  }

  public backupDetails():
    | HassioPartialBackupCreateParams
    | HassioFullBackupCreateParams {
    const data: any = {};

    if (!this.backup) {
      data.name =
        this.backupName ||
        formatDate(new Date(), this.hass.locale, this.hass.config);
    }

    if (this.backupHasPassword) {
      data.password = this.backupPassword;
      if (!this.backup) {
        data.confirm_password = this.confirmBackupPassword;
      }
    }

    if (this.backupType === "full") {
      return data;
    }

    const addons = this.addons
      ?.filter((addon) => addon.checked)
      .map((addon) => addon.slug);
    const folders = this.folders
      ?.filter((folder) => folder.checked)
      .map((folder) => folder.slug);

    if (addons?.length) {
      data.addons = addons;
    }
    if (folders?.length) {
      data.folders = folders;
    }
    data.homeassistant = this.homeAssistant;

    return data;
  }

  private _getSection(section: string) {
    const templates: TemplateResult[] = [];
    const addons =
      section === "addons"
        ? new Map(
            this.supervisor?.addon.addons.map((item) => [item.slug, item])
          )
        : undefined;
    let checkedItems = 0;
    this[section].forEach((item) => {
      templates.push(
        html`<ha-formfield
          .label=${html`<supervisor-formfield-label
            .label=${item.name}
            .iconPath=${section === "addons" ? mdiPuzzle : mdiFolder}
            .imageUrl=${section === "addons" &&
            !this.onboarding &&
            atLeastVersion(this.hass.config.version, 0, 105) &&
            addons?.get(item.slug)?.icon
              ? `/api/hassio/addons/${item.slug}/icon`
              : undefined}
            .version=${item.version}
          >
          </supervisor-formfield-label>`}
        >
          <ha-checkbox
            .item=${item}
            .checked=${item.checked}
            .section=${section}
            @change=${this._updateSectionEntry}
          >
          </ha-checkbox>
        </ha-formfield>`
      );

      if (item.checked) {
        checkedItems++;
      }
    });

    const checked = checkedItems === this[section].length;

    return {
      templates,
      checked,
      indeterminate: !checked && checkedItems !== 0,
    };
  }

  private _handleRadioValueChanged(ev: CustomEvent) {
    const input = ev.currentTarget as HaRadio;
    this[input.name] = input.value;
  }

  private _handleTextValueChanged(ev: ValueChangedEvent<string>) {
    const input = ev.currentTarget as PaperInputElement;
    this[input.name!] = ev.detail.value;
  }

  private _toggleHasPassword(): void {
    this.backupHasPassword = !this.backupHasPassword;
  }

  private _toggleSection(ev): void {
    const section = ev.currentTarget.section;

    this[section] = (section === "addons" ? this.addons : this.folders)!.map(
      (item) => ({
        ...item,
        checked: ev.currentTarget.checked,
      })
    );
  }

  private _updateSectionEntry(ev): void {
    const item = ev.currentTarget.item;
    const section = ev.currentTarget.section;
    this[section] = this[section].map((entry) =>
      entry.slug === item.slug
        ? {
            ...entry,
            checked: ev.currentTarget.checked,
          }
        : entry
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "supervisor-backup-content": SupervisorBackupContent;
  }
}
