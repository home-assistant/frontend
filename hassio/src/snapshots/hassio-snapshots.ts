import "@material/mwc-button";
import "@polymer/paper-card/paper-card";
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
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../src/common/dom/fire_event";
import {
  createHassioFullSnapshot,
  createHassioPartialSnapshot,
  fetchHassioSnapshots,
  HassioFullSnapshotCreateParams,
  HassioPartialSnapshotCreateParams,
  HassioSnapshot,
  reloadHassioSnapshots,
} from "../../../src/data/hassio/snapshot";
import { HassioSupervisorInfo } from "../../../src/data/hassio/supervisor";
import { PolymerChangedEvent } from "../../../src/polymer-types";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant, Route } from "../../../src/types";
import "../../../src/layouts/hass-tabs-subpage";
import "../components/hassio-card-content";
import { showHassioSnapshotDialog } from "../dialogs/snapshot/show-dialog-hassio-snapshot";
import { hassioStyle } from "../resources/hassio-style";

import { supervisorTabs } from "../hassio-panel";

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

  @property({ attribute: false }) public supervisorInfo!: HassioSupervisorInfo;

  @property() private _snapshotName = "";

  @property() private _snapshotPassword = "";

  @property() private _snapshotHasPassword = false;

  @property() private _snapshotType: HassioSnapshot["type"] = "full";

  @property() private _snapshots?: HassioSnapshot[] = [];

  @property() private _addonList: CheckboxItem[] = [];

  @property() private _folderList: CheckboxItem[] = [
    {
      slug: "homeassistant",
      name: "Home Assistant configuration",
      checked: true,
    },
    { slug: "ssl", name: "SSL", checked: true },
    { slug: "share", name: "Share", checked: true },
    { slug: "addons/local", name: "Local add-ons", checked: true },
  ];

  @property() private _creatingSnapshot = false;

  @property() private _error = "";

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

        <paper-icon-button
          icon="hassio:reload"
          slot="toolbar-icon"
          aria-label="Reload snapshots"
          @click=${this.refreshData}
        ></paper-icon-button>

        <div class="content">
          <h1>
            Create snapshot
          </h1>
          <p class="description">
            Snapshots allow you to easily backup and restore all data of your
            Home Assistant instance.
          </p>
          <div class="card-group">
            <paper-card>
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
                <mwc-button
                  .disabled=${this._creatingSnapshot}
                  @click=${this._createSnapshot}
                >
                  Create
                </mwc-button>
              </div>
            </paper-card>
          </div>

          <h1>Available snapshots</h1>
          <div class="card-group">
            ${this._snapshots === undefined
              ? undefined
              : this._snapshots.length === 0
              ? html`
                  <paper-card>
                    <div class="card-content">
                      You don't have any snapshots yet.
                    </div>
                  </paper-card>
                `
              : this._snapshots.map(
                  (snapshot) => html`
                    <paper-card
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
                            ? "hassio:package-variant-closed"
                            : "hassio:package-variant"}
                          .icon-class="snapshot"
                        ></hassio-card-content>
                      </div>
                    </paper-card>
                  `
                )}
          </div>
        </div>
      </hass-tabs-subpage>
    `;
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    this._updateSnapshots();
  }

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("supervisorInfo")) {
      this._addonList = this.supervisorInfo.addons
        .map((addon) => ({
          slug: addon.slug,
          name: addon.name,
          checked: true,
        }))
        .sort((a, b) => (a.name < b.name ? -1 : 1));
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
      this._error = err.message;
    }
  }

  private async _createSnapshot() {
    this._error = "";
    if (this._snapshotHasPassword && !this._snapshotPassword.length) {
      this._error = "Please enter a password.";
      return;
    }
    this._creatingSnapshot = true;
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
      fireEvent(this, "hass-api-called", { success: true, response: null });
    } catch (err) {
      this._error = err.message;
    } finally {
      this._creatingSnapshot = false;
    }
  }

  private _computeDetails(snapshot: HassioSnapshot) {
    const type =
      snapshot.type === "full" ? "Full snapshot" : "Partial snapshot";
    return snapshot.protected ? `${type}, password protected` : type;
  }

  private _snapshotClicked(ev) {
    showHassioSnapshotDialog(this, {
      slug: ev.currentTarget!.snapshot.slug,
      onDelete: () => this._updateSnapshots(),
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
