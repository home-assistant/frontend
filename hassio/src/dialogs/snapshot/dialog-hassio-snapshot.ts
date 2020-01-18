import "@material/mwc-button";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/iron-icon/iron-icon";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-input/paper-input";
import { PaperDialogElement } from "@polymer/paper-dialog";
import { PaperCheckboxElement } from "@polymer/paper-checkbox/paper-checkbox";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
  query,
} from "lit-element";

import {
  fetchHassioSnapshotInfo,
  HassioSnapshotDetail,
} from "../../../../src/data/hassio";
import { getSignedPath } from "../../../../src/data/auth";
import { HassioSnapshotDialogParams } from "./show-dialog-hassio-snapshot";
import { haStyleDialog } from "../../../../src/resources/styles";
import { HomeAssistant } from "../../../../src/types";
import { PolymerChangedEvent } from "../../../../src/polymer-types";

import "../../../../src/components/dialog/ha-paper-dialog";

const _computeFolders = (folders) => {
  const list: Array<{ slug: string; name: string; checked: boolean }> = [];
  if (folders.includes("homeassistant")) {
    list.push({
      slug: "homeassistant",
      name: "Home Assistant configuration",
      checked: true,
    });
  }
  if (folders.includes("ssl")) {
    list.push({ slug: "ssl", name: "SSL", checked: true });
  }
  if (folders.includes("share")) {
    list.push({ slug: "share", name: "Share", checked: true });
  }
  if (folders.includes("addons/local")) {
    list.push({ slug: "addons/local", name: "Local add-ons", checked: true });
  }
  return list;
};

const _computeAddons = (addons) => {
  return addons.map((addon) => ({
    slug: addon.slug,
    name: addon.name,
    version: addon.version,
    checked: true,
  }));
};

interface AddonItem {
  slug: string;
  name: string;
  version: string;
  checked: boolean | null | undefined;
}

interface FolderItem {
  slug: string;
  name: string;
  checked: boolean | null | undefined;
}

@customElement("dialog-hassio-snapshot")
class HassioSnapshotDialog extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() private _error?: string;
  @property() private snapshot?: HassioSnapshotDetail;
  @property() private _folders!: FolderItem[];
  @property() private _addons!: AddonItem[];
  @property() private _dialogParams?: HassioSnapshotDialogParams;
  @property() private _snapshotPassword!: string;
  @property() private _restoreHass: boolean | null | undefined = true;
  @query("#dialog") private _dialog!: PaperDialogElement;

  public async showDialog(params: HassioSnapshotDialogParams) {
    this.snapshot = await fetchHassioSnapshotInfo(this.hass, params.slug);
    this._folders = _computeFolders(
      this.snapshot.folders
    ).sort((a: FolderItem, b: FolderItem) => (a.name > b.name ? 1 : -1));
    this._addons = _computeAddons(
      this.snapshot.addons
    ).sort((a: AddonItem, b: AddonItem) => (a.name > b.name ? 1 : -1));

    this._dialogParams = params;

    try {
      this._dialog.open();
    } catch {
      await this.showDialog(params);
    }
  }

  protected render(): TemplateResult | void {
    if (!this.snapshot) {
      return html``;
    }
    return html`
      <ha-paper-dialog
        id="dialog"
        with-backdrop=""
        .on-iron-overlay-closed=${this._dialogClosed}
      >
        <app-toolbar>
          <paper-icon-button
            icon="hassio:close"
            dialog-dismiss=""
          ></paper-icon-button>
          <div main-title="">${this._computeName}</div>
        </app-toolbar>
        <div class="details">
          ${this.snapshot.type === "full"
            ? "Full snapshot"
            : "Partial snapshot"}
          (${this._computeSize})<br />
          ${this._formatDatetime(this.snapshot.date)}
        </div>
        <div>Home Assistant:</div>
        <paper-checkbox
          .checked=${this._restoreHass}
          @change="${(ev: Event) =>
            (this._restoreHass = (ev.target as PaperCheckboxElement).checked)}"
        >
          Home Assistant ${this.snapshot.homeassistant}
        </paper-checkbox>
        ${this._folders.length
          ? html`
              <div>Folders:</div>
              <paper-dialog-scrollable class="no-margin-top">
                ${this._folders.map((item) => {
                  return html`
                    <paper-checkbox
                      .checked=${item.checked}
                      @change="${(ev: Event) =>
                        this._updateFolders(
                          item,
                          (ev.target as PaperCheckboxElement).checked
                        )}"
                    >
                      ${item.name}
                    </paper-checkbox>
                  `;
                })}
              </paper-dialog-scrollable>
            `
          : ""}
        ${this._addons.length
          ? html`
              <div>Add-on:</div>
              <paper-dialog-scrollable class="no-margin-top">
                ${this._addons.map((item) => {
                  return html`
                    <paper-checkbox
                      .checked=${item.checked}
                      @change="${(ev: Event) =>
                        this._updateAddons(
                          item,
                          (ev.target as PaperCheckboxElement).checked
                        )}"
                    >
                      ${item.name}
                    </paper-checkbox>
                  `;
                })}
              </paper-dialog-scrollable>
            `
          : ""}
        ${this.snapshot.protected
          ? html`
              <paper-input
                autofocus=""
                label="Password"
                type="password"
                @value-changed=${this._passwordInput}
                .value=${this._snapshotPassword}
              ></paper-input>
            `
          : ""}
        ${this._error
          ? html`
              <p class="error">Error: ${this._error}</p>
            `
          : ""}

        <div>Actions:</div>
        <ul class="buttons">
          <li>
            <mwc-button @click=${this._downloadClicked}>
              <iron-icon icon="hassio:download" class="icon"></iron-icon>
              Download Snapshot
            </mwc-button>
          </li>
          <li>
            <mwc-button @click=${this._partialRestoreClicked}>
              <iron-icon icon="hassio:history" class="icon"> </iron-icon>
              Restore Selected
            </mwc-button>
          </li>
          ${this.snapshot.type === "full"
            ? html`
                <li>
                  <mwc-button @click=${this._fullRestoreClicked}>
                    <iron-icon icon="hassio:history" class="icon"> </iron-icon>
                    Wipe &amp; restore
                  </mwc-button>
                </li>
              `
            : ""}
          <li>
            <mwc-button @click=${this._deleteClicked}>
              <iron-icon icon="hassio:delete" class="icon warning"> </iron-icon>
              <span class="warning">Delete Snapshot</span>
            </mwc-button>
          </li>
        </ul>
      </ha-paper-dialog>
    `;
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        ha-paper-dialog {
          min-width: 350px;
          font-size: 14px;
          border-radius: 2px;
        }
        app-toolbar {
          margin: 0;
          padding: 0 16px;
          color: var(--primary-text-color);
          background-color: var(--secondary-background-color);
        }
        app-toolbar [main-title] {
          margin-left: 16px;
        }
        ha-paper-dialog-scrollable {
          margin: 0;
        }
        paper-checkbox {
          display: block;
          margin: 4px;
        }
        @media all and (max-width: 450px), all and (max-height: 500px) {
          ha-paper-dialog {
            max-height: 100%;
            height: 100%;
          }
          app-toolbar {
            color: var(--text-primary-color);
            background-color: var(--primary-color);
          }
        }
        .details {
          color: var(--secondary-text-color);
        }
        .warning,
        .error {
          color: var(--google-red-500);
        }
        .buttons {
          display: flex;
          flex-direction: column;
        }
        .buttons li {
          list-style-type: none;
        }
        .buttons .icon {
          margin-right: 16px;
        }
        .no-margin-top {
          margin-top: 0;
        }
      `,
    ];
  }

  private _updateFolders(item: FolderItem, value: boolean | null | undefined) {
    this._folders = this._folders.map((folder) => {
      if (folder.slug === item.slug) {
        folder.checked = value;
      }
      return folder;
    });
  }

  private _updateAddons(item: AddonItem, value: boolean | null | undefined) {
    this._addons = this._addons.map((addon) => {
      if (addon.slug === item.slug) {
        addon.checked = value;
      }
      return addon;
    });
  }

  private _passwordInput(ev: PolymerChangedEvent<string>) {
    this._snapshotPassword = ev.detail.value;
  }

  private _partialRestoreClicked() {
    if (!confirm("Are you sure you want to restore this snapshot?")) {
      return;
    }

    const addons = this._addons
      .filter((addon) => addon.checked)
      .map((addon) => addon.slug);

    const folders = this._folders
      .filter((folder) => folder.checked)
      .map((folder) => folder.slug);

    const data: {
      homeassistant: boolean | null | undefined;
      addons: any;
      folders: any;
      password?: string;
    } = {
      homeassistant: this._restoreHass,
      addons,
      folders,
    };

    if (this.snapshot!.protected) {
      data.password = this._snapshotPassword;
    }

    this.hass
      .callApi(
        "POST",

        `hassio/snapshots/${this.snapshot!.slug}/restore/partial`,
        data
      )
      .then(
        () => {
          alert("Snapshot restored!");
          this._dialog.close();
        },
        (error) => {
          this._error = error.body.message;
        }
      );
  }

  private _fullRestoreClicked() {
    if (!confirm("Are you sure you want to restore this snapshot?")) {
      return;
    }

    const data = this.snapshot!.protected
      ? { password: this._snapshotPassword }
      : undefined;

    this.hass
      .callApi(
        "POST",
        `hassio/snapshots/${this.snapshot!.slug}/restore/full`,
        data
      )
      .then(
        () => {
          alert("Snapshot restored!");
          this._dialog.close();
        },
        (error) => {
          this._error = error.body.message;
        }
      );
  }

  private _deleteClicked() {
    if (!confirm("Are you sure you want to delete this snapshot?")) {
      return;
    }

    this.hass

      .callApi("POST", `hassio/snapshots/${this.snapshot!.slug}/remove`)
      .then(
        () => {
          this._dialog.close();
          this._dialogParams!.onDelete();
        },
        (error) => {
          this._error = error.body.message;
        }
      );
  }

  private async _downloadClicked() {
    let signedPath: { path: string };
    try {
      signedPath = await getSignedPath(
        this.hass,
        `/api/hassio/snapshots/${this.snapshot!.slug}/download`
      );
    } catch (err) {
      alert(`Error: ${err.message}`);
      return;
    }

    const name = this._computeName.replace(/[^a-z0-9]+/gi, "_");
    const a = document.createElement("a");
    a.href = signedPath.path;
    a.download = `Hass_io_${name}.tar`;
    this._dialog.appendChild(a);
    a.click();
    this._dialog.removeChild(a);
  }

  private get _computeName() {
    return this.snapshot
      ? this.snapshot.name || this.snapshot.slug
      : "Unnamed snapshot";
  }

  private get _computeSize() {
    return Math.ceil(this.snapshot!.size * 10) / 10 + " MB";
  }

  private _formatDatetime(datetime) {
    return new Date(datetime).toLocaleDateString(navigator.language, {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  private _dialogClosed() {
    this._dialogParams = undefined;
    this.snapshot = undefined;
    this._snapshotPassword = "";
    this._folders = [];
    this._addons = [];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-hassio-snapshot": HassioSnapshotDialog;
  }
}
