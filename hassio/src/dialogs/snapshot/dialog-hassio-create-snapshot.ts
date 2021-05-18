import "@material/mwc-button";
import "@polymer/paper-input/paper-input";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { formatDate } from "../../../../src/common/datetime/format_date";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import { compare } from "../../../../src/common/string/compare";
import "../../../../src/components/buttons/ha-progress-button";
import "../../../../src/components/ha-checkbox";
import type { HaCheckbox } from "../../../../src/components/ha-checkbox";
import { createCloseHeading } from "../../../../src/components/ha-dialog";
import "../../../../src/components/ha-formfield";
import "../../../../src/components/ha-radio";
import type { HaRadio } from "../../../../src/components/ha-radio";
import "../../../../src/components/ha-settings-row";
import { extractApiErrorMessage } from "../../../../src/data/hassio/common";
import {
  createHassioFullSnapshot,
  createHassioPartialSnapshot,
  HassioFullSnapshotCreateParams,
  HassioPartialSnapshotCreateParams,
  HassioSnapshot,
} from "../../../../src/data/hassio/snapshot";
import { showAlertDialog } from "../../../../src/dialogs/generic/show-dialog-box";
import { PolymerChangedEvent } from "../../../../src/polymer-types";
import { haStyle, haStyleDialog } from "../../../../src/resources/styles";
import { HomeAssistant } from "../../../../src/types";
import { HassioCreateSnapshotDialogParams } from "./show-dialog-hassio-create-snapshot";

interface CheckboxItem {
  slug: string;
  checked: boolean;
  name?: string;
  version?: string;
}

const folderList = () => [
  {
    slug: "homeassistant",
    checked: true,
  },
  { slug: "ssl", checked: true },
  { slug: "share", checked: true },
  { slug: "media", checked: true },
  { slug: "addons/local", checked: true },
];

@customElement("dialog-hassio-create-snapshot")
class HassioCreateSnapshotDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _snapshotName = "";

  @state() private _snapshotPassword = "";

  @state() private _snapshotHasPassword = false;

  @state() private _snapshotType: HassioSnapshot["type"] = "full";

  @state() private _dialogParams?: HassioCreateSnapshotDialogParams;

  @state() private _addonList: CheckboxItem[] = [];

  @state() private _folderList: CheckboxItem[] = folderList();

  @state() private _error = "";

  public showDialog(params: HassioCreateSnapshotDialogParams) {
    this._dialogParams = params;
    this._addonList = this._dialogParams.supervisor.supervisor.addons
      .map((addon) => ({
        slug: addon.slug,
        name: addon.name,
        version: addon.version,
        checked: true,
      }))
      .sort((a, b) => compare(a.name, b.name));
    this._snapshotType = "full";
    this._error = "";
    this._folderList = folderList();
    this._snapshotHasPassword = false;
    this._snapshotPassword = "";
    this._snapshotName = "";
  }

  public closeDialog() {
    this._dialogParams = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._dialogParams) {
      return html``;
    }
    return html`
      <ha-dialog
        open
        @closing=${this.closeDialog}
        .heading=${createCloseHeading(
          this.hass,
          this._dialogParams.supervisor.localize("snapshot.create_snapshot")
        )}
      >
          <paper-input
            name="snapshotName"
            .label=${this._dialogParams.supervisor.localize("snapshot.name")}
            .value=${this._snapshotName}
            @value-changed=${this._handleTextValueChanged}
          >
          </paper-input>
          <div class="snapshot-types">
            <div>
              ${this._dialogParams.supervisor.localize("snapshot.type")}:
            </div>
            <ha-formfield
              .label=${this._dialogParams.supervisor.localize(
                "snapshot.full_snapshot"
              )}
            >
              <ha-radio
                @change=${this._handleRadioValueChanged}
                value="full"
                name="snapshotType"
                .checked=${this._snapshotType === "full"}
              >
              </ha-radio>
            </ha-formfield>
            <ha-formfield
              .label=${this._dialogParams.supervisor.localize(
                "snapshot.partial_snapshot"
              )}
            >
              <ha-radio
                @change=${this._handleRadioValueChanged}
                value="partial"
                name="snapshotType"
                .checked=${this._snapshotType === "partial"}
              >
              </ha-radio>
            </ha-formfield>
          </div>

          ${
            this._snapshotType === "full"
              ? undefined
              : html`
                  ${this._dialogParams.supervisor.localize("snapshot.folders")}:
                  <div class="checkbox-section">
                    ${this._folderList.map(
                      (folder, idx) => html`
                        <div class="checkbox-line">
                          <ha-checkbox
                            .idx=${idx}
                            .checked=${folder.checked}
                            @change=${this._folderChecked}
                            slot="prefix"
                          >
                          </ha-checkbox>
                          <span>
                            ${this._dialogParams!.supervisor.localize(
                              `snapshot.folder.${folder.slug}`
                            )}
                          </span>
                        </div>
                      `
                    )}
                  </div>

                  ${this._dialogParams.supervisor.localize("snapshot.addons")}:
                  <div class="checkbox-section">
                    ${this._addonList.map(
                      (addon, idx) => html`
                        <div class="checkbox-line">
                          <ha-checkbox
                            .idx=${idx}
                            .checked=${addon.checked}
                            @change=${this._addonChecked}
                            slot="prefix"
                          >
                          </ha-checkbox>
                          <span>
                            ${addon.name}<span class="version">
                              (${addon.version})
                            </span>
                          </span>
                        </div>
                      `
                    )}
                  </div>
                `
          }
          ${this._dialogParams.supervisor.localize("snapshot.security")}:
          <div class="checkbox-section">
          <div class="checkbox-line">
            <ha-checkbox
              .checked=${this._snapshotHasPassword}
              @change=${this._handleCheckboxValueChanged}
              slot="prefix"
            >
            </ha-checkbox>
            <span>
            ${this._dialogParams.supervisor.localize(
              "snapshot.password_protection"
            )}
              </span>
            </span>
          </div>
          </div>

          ${
            this._snapshotHasPassword
              ? html`
                  <paper-input
                    .label=${this._dialogParams.supervisor.localize(
                      "snapshot.password"
                    )}
                    type="password"
                    name="snapshotPassword"
                    .value=${this._snapshotPassword}
                    @value-changed=${this._handleTextValueChanged}
                  >
                  </paper-input>
                `
              : undefined
          }
          ${
            this._error !== ""
              ? html` <p class="error">${this._error}</p> `
              : undefined
          }
        <mwc-button slot="secondaryAction" @click=${this.closeDialog}>
          ${this._dialogParams.supervisor.localize("common.close")}
        </mwc-button>
        <ha-progress-button slot="primaryAction" @click=${this._createSnapshot}>
          ${this._dialogParams.supervisor.localize("snapshot.create")}
        </ha-progress-button>
      </ha-dialog>
    `;
  }

  private _handleTextValueChanged(ev: PolymerChangedEvent<string>) {
    const input = ev.currentTarget as PaperInputElement;
    this[`_${input.name}`] = ev.detail.value;
  }

  private _handleCheckboxValueChanged(ev: CustomEvent) {
    const input = ev.currentTarget as HaCheckbox;
    this._snapshotHasPassword = input.checked;
  }

  private _handleRadioValueChanged(ev: CustomEvent) {
    const input = ev.currentTarget as HaRadio;
    this[`_${input.name}`] = input.value;
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

  private async _createSnapshot(ev: CustomEvent): Promise<void> {
    if (this._dialogParams!.supervisor.info.state !== "running") {
      showAlertDialog(this, {
        title: this._dialogParams!.supervisor.localize(
          "snapshot.could_not_create"
        ),
        text: this._dialogParams!.supervisor.localize(
          "snapshot.create_blocked_not_running",
          "state",
          this._dialogParams!.supervisor.info.state
        ),
      });
      return;
    }
    const button = ev.currentTarget as any;
    button.progress = true;

    this._error = "";
    if (this._snapshotHasPassword && !this._snapshotPassword.length) {
      this._error = this._dialogParams!.supervisor.localize(
        "snapshot.enter_password"
      );
      button.progress = false;
      return;
    }
    const name = this._snapshotName || formatDate(new Date(), this.hass.locale);

    try {
      if (this._snapshotType === "full") {
        const data: HassioFullSnapshotCreateParams = { name };
        if (this._snapshotHasPassword) {
          data.password = this._snapshotPassword;
        }
        await createHassioFullSnapshot(this.hass, data);
      } else {
        const data: HassioPartialSnapshotCreateParams = {
          name,
          folders: this._folderList
            .filter((folder) => folder.checked)
            .map((folder) => folder.slug),
          addons: this._addonList
            .filter((addon) => addon.checked)
            .map((addon) => addon.slug),
        };
        if (this._snapshotHasPassword) {
          data.password = this._snapshotPassword;
        }
        await createHassioPartialSnapshot(this.hass, data);
      }

      this._dialogParams!.onCreate();
      this.closeDialog();
    } catch (err) {
      this._error = extractApiErrorMessage(err);
    }
    button.progress = false;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        .error {
          color: var(--error-color);
        }
        paper-input[type="password"] {
          display: block;
          margin: 4px 0 4px 16px;
        }
        span.version {
          color: var(--secondary-text-color);
        }
        .checkbox-section {
          display: grid;
        }
        .checkbox-line {
          display: inline-flex;
          align-items: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-hassio-create-snapshot": HassioCreateSnapshotDialog;
  }
}
