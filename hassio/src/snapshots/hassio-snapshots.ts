import "@material/mwc-button";
import "@material/mwc-icon-button";
import { ActionDetail } from "@material/mwc-list/mwc-list-foundation";
import "@material/mwc-list/mwc-list-item";
import {
  mdiDotsVertical,
  mdiPackageVariant,
  mdiPackageVariantClosed,
} from "@mdi/js";
import "@polymer/paper-checkbox/paper-checkbox";
import type { PaperCheckboxElement } from "@polymer/paper-checkbox/paper-checkbox";
import "@polymer/paper-input/paper-input";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import "@polymer/paper-radio-button/paper-radio-button";
import "@polymer/paper-radio-group/paper-radio-group";
import type { PaperRadioGroupElement } from "@polymer/paper-radio-group/paper-radio-group";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { atLeastVersion } from "../../../src/common/config/version";
import "../../../src/components/buttons/ha-progress-button";
import "../../../src/components/ha-button-menu";
import "../../../src/components/ha-card";
import "../../../src/components/ha-svg-icon";
import { extractApiErrorMessage } from "../../../src/data/hassio/common";
import {
  createHassioFullSnapshot,
  createHassioPartialSnapshot,
  fetchHassioSnapshots,
  HassioFullSnapshotCreateParams,
  HassioPartialSnapshotCreateParams,
  HassioSnapshot,
  reloadHassioSnapshots,
} from "../../../src/data/hassio/snapshot";
import { Supervisor } from "../../../src/data/supervisor/supervisor";
import { showAlertDialog } from "../../../src/dialogs/generic/show-dialog-box";
import "../../../src/layouts/hass-tabs-subpage";
import { PolymerChangedEvent } from "../../../src/polymer-types";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant, Route } from "../../../src/types";
import "../components/hassio-card-content";
import "../components/hassio-upload-snapshot";
import { showHassioSnapshotDialog } from "../dialogs/snapshot/show-dialog-hassio-snapshot";
import { showSnapshotUploadDialog } from "../dialogs/snapshot/show-dialog-snapshot-upload";
import { supervisorTabs } from "../hassio-tabs";
import { hassioStyle } from "../resources/hassio-style";

interface CheckboxItem {
  slug: string;
  name: string;
  checked: boolean;
}

@customElement("hassio-snapshots")
class HassioSnapshots extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @internalProperty() private _snapshotName = "";

  @internalProperty() private _snapshotPassword = "";

  @internalProperty() private _snapshotHasPassword = false;

  @internalProperty() private _snapshotType: HassioSnapshot["type"] = "full";

  @internalProperty() private _snapshots?: HassioSnapshot[] = [];

  @internalProperty() private _addonList: CheckboxItem[] = [];

  @internalProperty() private _folderList: CheckboxItem[] = [
    {
      slug: "homeassistant",
      name: "Home Assistant configuration",
      checked: true,
    },
    { slug: "ssl", name: "SSL", checked: true },
    { slug: "share", name: "Share", checked: true },
    { slug: "media", name: "Media", checked: true },
    { slug: "addons/local", name: "Local add-ons", checked: true },
  ];

  @internalProperty() private _error = "";

  public async refreshData() {
    await reloadHassioSnapshots(this.hass);
    await this._updateSnapshots();
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        hassio
        main-page
        .route=${this.route}
        .tabs=${supervisorTabs}
      >
        <span slot="header">Snapshots</span>
        <ha-button-menu
          corner="BOTTOM_START"
          slot="toolbar-icon"
          @action=${this._handleAction}
        >
          <mwc-icon-button slot="trigger" alt="menu">
            <ha-svg-icon .path=${mdiDotsVertical}></ha-svg-icon>
          </mwc-icon-button>
          <mwc-list-item>
            Reload
          </mwc-list-item>
          ${atLeastVersion(this.hass.config.version, 0, 116)
            ? html`<mwc-list-item>
                Upload snapshot
              </mwc-list-item>`
            : ""}
        </ha-button-menu>

        <div class="content">
          <h1>
            Create Snapshot
          </h1>
          <p class="description">
            Snapshots allow you to easily backup and restore all data of your
            Home Assistant instance.
          </p>
          <div class="card-group">
            <ha-card>
              <div class="card-content">
                <paper-input
                  autofocus
                  label="Name"
                  name="snapshotName"
                  .value=${this._snapshotName}
                  @value-changed=${this._handleTextValueChanged}
                ></paper-input>
                Type:
                <paper-radio-group
                  name="snapshotType"
                  .selected=${this._snapshotType}
                  @selected-changed=${this._handleRadioValueChanged}
                >
                  <paper-radio-button name="full">
                    Full snapshot
                  </paper-radio-button>
                  <paper-radio-button name="partial">
                    Partial snapshot
                  </paper-radio-button>
                </paper-radio-group>
                ${this._snapshotType === "full"
                  ? undefined
                  : html`
                      Folders:
                      ${this._folderList.map(
                        (folder, idx) => html`
                          <paper-checkbox
                            .idx=${idx}
                            .checked=${folder.checked}
                            @checked-changed=${this._folderChecked}
                          >
                            ${folder.name}
                          </paper-checkbox>
                        `
                      )}
                      Add-ons:
                      ${this._addonList.map(
                        (addon, idx) => html`
                          <paper-checkbox
                            .idx=${idx}
                            .checked=${addon.checked}
                            @checked-changed=${this._addonChecked}
                          >
                            ${addon.name}
                          </paper-checkbox>
                        `
                      )}
                    `}
                Security:
                <paper-checkbox
                  name="snapshotHasPassword"
                  .checked=${this._snapshotHasPassword}
                  @checked-changed=${this._handleCheckboxValueChanged}
                >
                  Password protection
                </paper-checkbox>
                ${this._snapshotHasPassword
                  ? html`
                      <paper-input
                        label="Password"
                        type="password"
                        name="snapshotPassword"
                        .value=${this._snapshotPassword}
                        @value-changed=${this._handleTextValueChanged}
                      ></paper-input>
                    `
                  : undefined}
                ${this._error !== ""
                  ? html` <p class="error">${this._error}</p> `
                  : undefined}
              </div>
              <div class="card-actions">
                <ha-progress-button
                  @click=${this._createSnapshot}
                  title="${this.supervisor.info.state !== "running"
                    ? `Creating a snapshot is not possible right now because the system is in ${this.supervisor.info.state} state.`
                    : ""}"
                  .disabled=${this.supervisor.info.state !== "running"}
                >
                  Create
                </ha-progress-button>
              </div>
            </ha-card>
          </div>

          <h1>Available Snapshots</h1>
          <div class="card-group">
            ${this._snapshots === undefined
              ? undefined
              : this._snapshots.length === 0
              ? html`
                  <ha-card>
                    <div class="card-content">
                      You don't have any snapshots yet.
                    </div>
                  </ha-card>
                `
              : this._snapshots.map(
                  (snapshot) => html`
                    <ha-card
                      class="pointer"
                      .snapshot=${snapshot}
                      @click=${this._snapshotClicked}
                    >
                      <div class="card-content">
                        <hassio-card-content
                          .hass=${this.hass}
                          .title=${snapshot.name || snapshot.slug}
                          .description=${this._computeDetails(snapshot)}
                          .datetime=${snapshot.date}
                          .icon=${snapshot.type === "full"
                            ? mdiPackageVariantClosed
                            : mdiPackageVariant}
                          icon-class="snapshot"
                        ></hassio-card-content>
                      </div>
                    </ha-card>
                  `
                )}
          </div>
        </div>
      </hass-tabs-subpage>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this.refreshData();
  }

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("supervisor")) {
      this._addonList = this.supervisor.supervisor.addons
        .map((addon) => ({
          slug: addon.slug,
          name: addon.name,
          checked: true,
        }))
        .sort((a, b) => (a.name < b.name ? -1 : 1));
    }
  }

  private _handleAction(ev: CustomEvent<ActionDetail>) {
    switch (ev.detail.index) {
      case 0:
        this.refreshData();
        break;
      case 1:
        this._showUploadSnapshotDialog();
        break;
    }
  }

  private _handleTextValueChanged(ev: PolymerChangedEvent<string>) {
    const input = ev.currentTarget as PaperInputElement;
    this[`_${input.name}`] = ev.detail.value;
  }

  private _handleCheckboxValueChanged(ev) {
    const input = ev.currentTarget as PaperCheckboxElement;
    this[`_${input.name}`] = input.checked;
  }

  private _handleRadioValueChanged(ev: PolymerChangedEvent<string>) {
    const input = ev.currentTarget as PaperRadioGroupElement;
    this[`_${input.getAttribute("name")}`] = ev.detail.value;
  }

  private _folderChecked(ev) {
    const { idx, checked } = ev.currentTarget!;
    this._folderList = this._folderList.map((folder, curIdx) =>
      curIdx === idx ? { ...folder, checked } : folder
    );
  }

  private _addonChecked(ev) {
    const { idx, checked } = ev.currentTarget!;
    this._addonList = this._addonList.map((addon, curIdx) =>
      curIdx === idx ? { ...addon, checked } : addon
    );
  }

  private async _updateSnapshots() {
    try {
      this._snapshots = await fetchHassioSnapshots(this.hass);
      this._snapshots.sort((a, b) => (a.date < b.date ? 1 : -1));
    } catch (err) {
      this._error = extractApiErrorMessage(err);
    }
  }

  private async _createSnapshot(ev: CustomEvent): Promise<void> {
    if (this.supervisor.info.state !== "running") {
      await showAlertDialog(this, {
        title: "Could not create snapshot",
        text: `Creating a snapshot is not possible right now because the system is in ${this.supervisor.info.state} state.`,
      });
    }
    const button = ev.currentTarget as any;
    button.progress = true;

    this._error = "";
    if (this._snapshotHasPassword && !this._snapshotPassword.length) {
      this._error = "Please enter a password.";
      button.progress = false;
      return;
    }
    await this.updateComplete;

    const name =
      this._snapshotName ||
      new Date().toLocaleDateString(navigator.language, {
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric",
      });

    try {
      if (this._snapshotType === "full") {
        const data: HassioFullSnapshotCreateParams = { name };
        if (this._snapshotHasPassword) {
          data.password = this._snapshotPassword;
        }
        await createHassioFullSnapshot(this.hass, data);
      } else {
        const addons = this._addonList
          .filter((addon) => addon.checked)
          .map((addon) => addon.slug);
        const folders = this._folderList
          .filter((folder) => folder.checked)
          .map((folder) => folder.slug);

        const data: HassioPartialSnapshotCreateParams = {
          name,
          folders,
          addons,
        };
        if (this._snapshotHasPassword) {
          data.password = this._snapshotPassword;
        }
        await createHassioPartialSnapshot(this.hass, data);
      }
      this._updateSnapshots();
    } catch (err) {
      this._error = extractApiErrorMessage(err);
    }
    button.progress = false;
  }

  private _computeDetails(snapshot: HassioSnapshot) {
    const type =
      snapshot.type === "full" ? "Full snapshot" : "Partial snapshot";
    return snapshot.protected ? `${type}, password protected` : type;
  }

  private _snapshotClicked(ev) {
    showHassioSnapshotDialog(this, {
      slug: ev.currentTarget!.snapshot.slug,
      supervisor: this.supervisor,
      onDelete: () => this._updateSnapshots(),
    });
  }

  private _showUploadSnapshotDialog() {
    showSnapshotUploadDialog(this, {
      showSnapshot: (slug: string) =>
        showHassioSnapshotDialog(this, {
          slug,
          supervisor: this.supervisor,
          onDelete: () => this._updateSnapshots(),
        }),
      reloadSnapshot: () => this.refreshData(),
    });
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      hassioStyle,
      css`
        paper-radio-group {
          display: block;
        }
        paper-radio-button {
          padding: 0 0 2px 2px;
        }
        paper-radio-button,
        paper-checkbox,
        paper-input[type="password"] {
          display: block;
          margin: 4px 0 4px 48px;
        }
        .pointer {
          cursor: pointer;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hassio-snapshots": HassioSnapshots;
  }
}
