import { mdiFolder, mdiHomeAssistant, mdiPuzzle } from "@mdi/js";
import { PaperInputElement } from "@polymer/paper-input/paper-input";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { atLeastVersion } from "../../../src/common/config/version";
import { formatDate } from "../../../src/common/datetime/format_date";
import { formatDateTime } from "../../../src/common/datetime/format_date_time";
import "../../../src/components/ha-checkbox";
import "../../../src/components/ha-formfield";
import "../../../src/components/ha-radio";
import type { HaRadio } from "../../../src/components/ha-radio";
import {
  HassioFullSnapshotCreateParams,
  HassioPartialSnapshotCreateParams,
  HassioSnapshotDetail,
} from "../../../src/data/hassio/snapshot";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import { PolymerChangedEvent } from "../../../src/polymer-types";
import { HomeAssistant } from "../../../src/types";
import "./supervisor-formfield-label";

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
  if (folders.includes("homeassistant")) {
    list.push({
      slug: "homeassistant",
      name: "Home Assistant configuration",
      checked: false,
    });
  }
  if (folders.includes("ssl")) {
    list.push({ slug: "ssl", name: "SSL", checked: false });
  }
  if (folders.includes("share")) {
    list.push({ slug: "share", name: "Share", checked: false });
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

@customElement("supervisor-snapshot-content")
export class SupervisorSnapshotContent extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public supervisor?: Supervisor;

  @property({ attribute: false }) public snapshot?: HassioSnapshotDetail;

  @property() public snapshotType: HassioSnapshotDetail["type"] = "full";

  @property({ attribute: false }) public folders?: CheckboxItem[];

  @property({ attribute: false }) public addons?: AddonCheckboxItem[];

  @property({ type: Boolean }) public homeAssistant = false;

  @property({ type: Boolean }) public snapshotHasPassword = false;

  @property() public snapshotName = "";

  @property() public snapshotPassword = "";

  public willUpdate(changedProps) {
    super.willUpdate(changedProps);
    if (!this.hasUpdated) {
      this.folders = _computeFolders(
        this.snapshot
          ? this.snapshot.folders
          : ["homeassistant", "ssl", "share", "media", "addons/local"]
      );
      this.addons = _computeAddons(
        this.snapshot
          ? this.snapshot.addons
          : this.supervisor?.supervisor.addons
      );
      this.snapshotType = this.snapshot?.type || "full";
      this.snapshotName = this.snapshot?.name || "";
      this.snapshotHasPassword = this.snapshot?.protected || false;
    }
  }

  protected render(): TemplateResult {
    if (!this.supervisor) {
      return html``;
    }
    const foldersSection =
      this.snapshotType === "partial" ? this._getSection("folders") : undefined;
    const addonsSection =
      this.snapshotType === "partial" ? this._getSection("addons") : undefined;

    return html`
      ${this.snapshot
        ? html`<div class="details">
            ${this.snapshot.type === "full"
              ? this.supervisor.localize("snapshot.full_snapshot")
              : this.supervisor.localize("snapshot.partial_snapshot")}
            (${Math.ceil(this.snapshot.size * 10) / 10 + " MB"})<br />
            ${formatDateTime(new Date(this.snapshot.date), this.hass.locale)}
          </div>`
        : html`<paper-input
            name="snapshotName"
            .label=${this.supervisor.localize("snapshot.name")}
            .value=${this.snapshotName}
            @value-changed=${this._handleTextValueChanged}
          >
          </paper-input>`}
      ${!this.snapshot || this.snapshot.type === "full"
        ? html`<div class="sub-header">
              ${!this.snapshot
                ? this.supervisor.localize("snapshot.type")
                : this.supervisor.localize("snapshot.select_type")}
            </div>
            <div class="snapshot-types">
              <ha-formfield
                .label=${this.supervisor.localize("snapshot.full_snapshot")}
              >
                <ha-radio
                  @change=${this._handleRadioValueChanged}
                  value="full"
                  name="snapshotType"
                  .checked=${this.snapshotType === "full"}
                >
                </ha-radio>
              </ha-formfield>
              <ha-formfield
                .label=${this.supervisor!.localize("snapshot.partial_snapshot")}
              >
                <ha-radio
                  @change=${this._handleRadioValueChanged}
                  value="partial"
                  name="snapshotType"
                  .checked=${this.snapshotType === "partial"}
                >
                </ha-radio>
              </ha-formfield>
            </div>`
        : ""}
      ${this.snapshot && this.snapshotType === "partial"
        ? html`
            ${this.snapshot.homeassistant
              ? html`
                  <ha-formfield
                    .label=${html`<supervisor-formfield-label
                      label="Home Assistant"
                      .iconPath=${mdiHomeAssistant}
                      .version=${this.snapshot.homeassistant}
                    >
                    </supervisor-formfield-label>`}
                  >
                    <ha-checkbox
                      .checked=${this.homeAssistant}
                      @click=${() => {
                        this.homeAssistant = !this.homeAssistant;
                      }}
                    >
                    </ha-checkbox>
                  </ha-formfield>
                `
              : ""}
          `
        : ""}
      ${this.snapshotType === "partial"
        ? html`
            ${foldersSection?.templates.length
              ? html`
                  <ha-formfield
                    .label=${html`<supervisor-formfield-label
                      .label=${this.supervisor.localize("snapshot.folders")}
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
                      .label=${this.supervisor.localize("snapshot.addons")}
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
          `
        : ""}
      ${!this.snapshot
        ? html`<ha-formfield
            .label=${this.supervisor.localize("snapshot.password_protection")}
          >
            <ha-checkbox
              .checked=${this.snapshotHasPassword}
              @change=${this._toggleHasPassword}
            >
            </ha-checkbox
          ></ha-formfield>`
        : ""}
      ${this.snapshotHasPassword
        ? html`
            <paper-input
              .label=${this.supervisor.localize("snapshot.password")}
              type="password"
              name="snapshotPassword"
              .value=${this.snapshotPassword}
              @value-changed=${this._handleTextValueChanged}
            >
            </paper-input>
          `
        : ""}
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-checkbox {
        --mdc-checkbox-touch-target-size: 16px;
        display: block;
        margin: 4px 12px 8px 0;
      }
      ha-formfield {
        display: contents;
      }
      supervisor-formfield-label {
        display: inline-flex;
        align-items: center;
      }
      paper-input[type="password"] {
        display: block;
        margin: 4px 0 4px 16px;
      }
      .details {
        color: var(--secondary-text-color);
      }
      .section-content {
        display: flex;
        flex-direction: column;
        margin-left: 16px;
      }
      .security {
        margin-top: 16px;
      }
      .snapshot-types {
        display: flex;
      }
      .sub-header {
        margin-top: 8px;
      }
    `;
  }

  public snapshotDetails():
    | HassioPartialSnapshotCreateParams
    | HassioFullSnapshotCreateParams {
    const data: any = {};

    if (!this.snapshot) {
      data.name = this.snapshotName || formatDate(new Date(), this.hass.locale);
    }

    if (this.snapshotHasPassword) {
      data.password = this.snapshotPassword;
    }

    if (this.snapshotType === "full") {
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
    if (this.homeAssistant) {
      data.homeassistant = this.homeAssistant;
    }

    return data;
  }

  private _getSection(section: string) {
    const templates: TemplateResult[] = [];
    const addons =
      section === "addons"
        ? new Map(
            this.supervisor!.addon.addons.map((item) => [item.slug, item])
          )
        : undefined;
    let checkedItems = 0;
    this[section].forEach((item) => {
      templates.push(html`<ha-formfield
        .label=${html`<supervisor-formfield-label
          .label=${item.name}
          .iconPath=${section === "addons" ? mdiPuzzle : mdiFolder}
          .imageUrl=${section === "addons" &&
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
      </ha-formfield>`);

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

  private _handleTextValueChanged(ev: PolymerChangedEvent<string>) {
    const input = ev.currentTarget as PaperInputElement;
    this[input.name!] = ev.detail.value;
  }

  private _toggleHasPassword(): void {
    this.snapshotHasPassword = !this.snapshotHasPassword;
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
    "supervisor-snapshot-content": SupervisorSnapshotContent;
  }
}
