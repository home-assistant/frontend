import "@material/mwc-button";
import "@polymer/paper-checkbox/paper-checkbox";
import type { PaperCheckboxElement } from "@polymer/paper-checkbox/paper-checkbox";
import "@polymer/paper-input/paper-input";
import type { PaperInputElement } from "@polymer/paper-input/paper-input";
import "@polymer/paper-radio-button/paper-radio-button";
import "@polymer/paper-radio-group/paper-radio-group";
import type { PaperRadioGroupElement } from "@polymer/paper-radio-group/paper-radio-group";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { compare } from "../../../../src/common/string/compare";
import "../../../../src/components/buttons/ha-progress-button";
import { createCloseHeading } from "../../../../src/components/ha-dialog";
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

@customElement("dialog-hassio-create-snapshot")
class HassioCreateSnapshotDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @internalProperty() private _snapshotName = "";

  @internalProperty() private _snapshotPassword = "";

  @internalProperty() private _snapshotHasPassword = false;

  @internalProperty() private _snapshotType: HassioSnapshot["type"] = "full";

  @internalProperty() private _dialogParams?: HassioCreateSnapshotDialogParams;

  @internalProperty() private _addonList: CheckboxItem[] = [];

  @internalProperty() private _folderList: CheckboxItem[] = [
    {
      slug: "homeassistant",
      checked: true,
    },
    { slug: "ssl", checked: true },
    { slug: "share", checked: true },
    { slug: "media", checked: true },
    { slug: "addons/local", checked: true },
  ];

  @internalProperty() private _error = "";

  public async showDialog(params: HassioCreateSnapshotDialogParams) {
    this._dialogParams = params;
    this._addonList = this._dialogParams.supervisor.supervisor.addons
      .map((addon) => ({
        slug: addon.slug,
        name: addon.name,
        version: addon.version,
        checked: true,
      }))
      .sort((a, b) => compare(a.name, b.name));
  }

  private _closeDialog() {
    this._dialogParams = undefined;
  }

  protected render(): TemplateResult {
    if (!this._dialogParams) {
      return html``;
    }
    return html`
      <ha-dialog
        open
        @closing=${this._closeDialog}
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
        ${this._dialogParams.supervisor.localize("snapshot.type")}:
        <paper-radio-group
          name="snapshotType"
          type="${this._dialogParams.supervisor.localize("snapshot.type")}"
          .selected=${this._snapshotType}
          @selected-changed=${this._handleRadioValueChanged}
        >
          <paper-radio-button name="full">
            ${this._dialogParams.supervisor.localize("snapshot.full_snapshot")}
          </paper-radio-button>
          <paper-radio-button name="partial">
            ${this._dialogParams.supervisor.localize(
              "snapshot.partial_snapshot"
            )}
          </paper-radio-button>
        </paper-radio-group>
        ${this._snapshotType === "full"
          ? undefined
          : html`
              ${this._dialogParams.supervisor.localize("snapshot.folders")}:
              ${this._folderList.map(
                (folder, idx) => html`
                  <paper-checkbox
                    .idx=${idx}
                    .checked=${folder.checked}
                    @checked-changed=${this._folderChecked}
                  >
                    ${this._dialogParams!.supervisor.localize(
                      `snapshot.folder.${folder.slug}`
                    )}
                  </paper-checkbox>
                `
              )}
              ${this._dialogParams.supervisor.localize("snapshot.addons")}:
              ${this._addonList.map(
                (addon, idx) => html`
                  <paper-checkbox
                    .idx=${idx}
                    .checked=${addon.checked}
                    @checked-changed=${this._addonChecked}
                  >
                    ${addon.name}
                    <span class="version">(${addon.version})</span>
                  </paper-checkbox>
                `
              )}
            `}
        ${this._dialogParams.supervisor.localize("snapshot.security")}:
        <paper-checkbox
          name="snapshotHasPassword"
          .checked=${this._snapshotHasPassword}
          @checked-changed=${this._handleCheckboxValueChanged}
        >
          ${this._dialogParams.supervisor.localize(
            "snapshot.password_protection"
          )}
        </paper-checkbox>
        ${this._snapshotHasPassword
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
          : undefined}
        ${this._error !== ""
          ? html` <p class="error">${this._error}</p> `
          : undefined}
        <mwc-button slot="secondaryAction" @click=${this._closeDialog}>
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

  private async _createSnapshot(ev: CustomEvent): Promise<void> {
    if (this._dialogParams!.supervisor.info.state !== "running") {
      await showAlertDialog(this, {
        title: this._dialogParams!.supervisor.localize(
          "snapshot.could_not_create"
        ),
        text: this._dialogParams!.supervisor.localize(
          "snapshot.create_blocked_not_running",
          "state",
          this._dialogParams!.supervisor.info.state
        ),
      });
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
      this._closeDialog();
    } catch (err) {
      this._error = extractApiErrorMessage(err);
    }
    button.progress = false;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      haStyleDialog,
      css`
        paper-checkbox {
          display: block;
          margin: 4px;
        }
        .error {
          color: var(--error-color);
        }
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
          margin: 4px 0 4px 16px;
        }
        span.version {
          color: var(--secondary-text-color);
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
