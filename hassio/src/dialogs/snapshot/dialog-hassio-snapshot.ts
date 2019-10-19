import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@material/mwc-button";
import "@polymer/paper-checkbox/paper-checkbox";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/iron-icon/iron-icon";
import "@polymer/paper-input/paper-input";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { getSignedPath } from "../../../../src/data/auth";

import "../../../../src/resources/ha-style";
import "../../../../src/components/dialog/ha-paper-dialog";
import { customElement } from "lit-element";
import { PaperDialogElement } from "@polymer/paper-dialog";
import { HassioSnapshotDialogParams } from "./show-dialog-hassio-snapshot";
import { fetchHassioSnapshotInfo } from "../../../../src/data/hassio";

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

@customElement("dialog-hassio-snapshot")
class HassioSnapshotDialog extends PolymerElement {
  // Commented out because it breaks Polymer! Kept around for when we migrate
  // to Lit. Now just putting ts-ignore everywhere because we need this out.
  // Sorry future developer.
  // public hass!: HomeAssistant;
  // protected error?: string;
  // private snapshot?: any;
  // private dialogParams?: HassioSnapshotDialogParams;
  // private restoreHass!: boolean;
  // private snapshotPassword!: string;

  static get template() {
    return html`
      <style include="ha-style-dialog">
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
      </style>
      <ha-paper-dialog
        id="dialog"
        with-backdrop=""
        on-iron-overlay-closed="_dialogClosed"
      >
        <app-toolbar>
          <paper-icon-button
            icon="hassio:close"
            dialog-dismiss=""
          ></paper-icon-button>
          <div main-title="">[[_computeName(snapshot)]]</div>
        </app-toolbar>
        <div class="details">
          [[_computeType(snapshot.type)]] ([[_computeSize(snapshot.size)]])<br />
          [[_formatDatetime(snapshot.date)]]
        </div>
        <div>Home Assistant:</div>
        <paper-checkbox checked="{{restoreHass}}">
          Home Assistant [[snapshot.homeassistant]]
        </paper-checkbox>
        <template is="dom-if" if="[[_folders.length]]">
          <div>Folders:</div>
          <template is="dom-repeat" items="[[_folders]]">
            <paper-checkbox checked="{{item.checked}}">
              [[item.name]]
            </paper-checkbox>
          </template>
        </template>
        <template is="dom-if" if="[[_addons.length]]">
          <div>Add-ons:</div>
          <paper-dialog-scrollable class="no-margin-top">
            <template is="dom-repeat" items="[[_addons]]" sort="_sortAddons">
              <paper-checkbox checked="{{item.checked}}">
                [[item.name]] <span class="details">([[item.version]])</span>
              </paper-checkbox>
            </template>
          </paper-dialog-scrollable>
        </template>
        <template is="dom-if" if="[[snapshot.protected]]">
          <paper-input
            autofocus=""
            label="Password"
            type="password"
            value="{{snapshotPassword}}"
          ></paper-input>
        </template>
        <template is="dom-if" if="[[error]]">
          <p class="error">Error: [[error]]</p>
        </template>
        <div>Actions:</div>
        <ul class="buttons">
          <li>
            <mwc-button on-click="_downloadClicked">
              <iron-icon icon="hassio:download" class="icon"></iron-icon>
              Download Snapshot
            </mwc-button>
          </li>
          <li>
            <mwc-button on-click="_partialRestoreClicked">
              <iron-icon icon="hassio:history" class="icon"> </iron-icon>
              Restore Selected
            </mwc-button>
          </li>
          <template is="dom-if" if="[[_isFullSnapshot(snapshot.type)]]">
            <li>
              <mwc-button on-click="_fullRestoreClicked">
                <iron-icon icon="hassio:history" class="icon"> </iron-icon>
                Wipe &amp; restore
              </mwc-button>
            </li>
          </template>
          <li>
            <mwc-button on-click="_deleteClicked">
              <iron-icon icon="hassio:delete" class="icon warning"> </iron-icon>
              <span class="warning">Delete Snapshot</span>
            </mwc-button>
          </li>
        </ul>
      </ha-paper-dialog>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      dialogParams: Object,
      snapshot: Object,
      _folders: Object,
      _addons: Object,
      restoreHass: {
        type: Boolean,
        value: true,
      },
      snapshotPassword: String,
      error: String,
    };
  }

  public async showDialog(params: HassioSnapshotDialogParams) {
    // @ts-ignore
    const snapshot = await fetchHassioSnapshotInfo(this.hass, params.slug);
    this.setProperties({
      dialogParams: params,
      snapshot,
      _folders: _computeFolders(snapshot.folders),
      _addons: _computeAddons(snapshot.addons),
    });
    (this.$.dialog as PaperDialogElement).open();
  }

  protected _isFullSnapshot(type) {
    return type === "full";
  }

  protected _partialRestoreClicked() {
    if (!confirm("Are you sure you want to restore this snapshot?")) {
      return;
    }
    // @ts-ignore
    const addons = this._addons
      .filter((addon) => addon.checked)
      .map((addon) => addon.slug);
    // @ts-ignore
    const folders = this._folders
      .filter((folder) => folder.checked)
      .map((folder) => folder.slug);

    const data = {
      // @ts-ignore
      homeassistant: this.restoreHass,
      addons,
      folders,
    };
    // @ts-ignore
    if (this.snapshot.protected) {
      // @ts-ignore
      data.password = this.snapshotPassword;
    }

    // @ts-ignore
    this.hass
      .callApi(
        "POST",
        // @ts-ignore
        `hassio/snapshots/${this.dialogParams!.slug}/restore/partial`,
        data
      )
      .then(
        () => {
          alert("Snapshot restored!");
          (this.$.dialog as PaperDialogElement).close();
        },
        (error) => {
          // @ts-ignore
          this.error = error.body.message;
        }
      );
  }

  protected _fullRestoreClicked() {
    if (!confirm("Are you sure you want to restore this snapshot?")) {
      return;
    }
    // @ts-ignore
    const data = this.snapshot.protected
      ? {
          password:
            // @ts-ignore
            this.snapshotPassword,
        }
      : undefined;
    // @ts-ignore
    this.hass
      .callApi(
        "POST",
        // @ts-ignore
        `hassio/snapshots/${this.dialogParams!.slug}/restore/full`,
        data
      )
      .then(
        () => {
          alert("Snapshot restored!");
          (this.$.dialog as PaperDialogElement).close();
        },
        (error) => {
          // @ts-ignore
          this.error = error.body.message;
        }
      );
  }

  protected _deleteClicked() {
    if (!confirm("Are you sure you want to delete this snapshot?")) {
      return;
    }
    // @ts-ignore
    this.hass
      // @ts-ignore
      .callApi("POST", `hassio/snapshots/${this.dialogParams!.slug}/remove`)
      .then(
        () => {
          (this.$.dialog as PaperDialogElement).close();
          // @ts-ignore
          this.dialogParams!.onDelete();
        },
        (error) => {
          // @ts-ignore
          this.error = error.body.message;
        }
      );
  }

  protected async _downloadClicked() {
    let signedPath;
    try {
      signedPath = await getSignedPath(
        // @ts-ignore
        this.hass,
        // @ts-ignore
        `/api/hassio/snapshots/${this.dialogParams!.slug}/download`
      );
    } catch (err) {
      alert(`Error: ${err.message}`);
      return;
    }
    // @ts-ignore
    const name = this._computeName(this.snapshot).replace(/[^a-z0-9]+/gi, "_");
    const a = document.createElement("a");
    a.href = signedPath.path;
    a.download = `Hass_io_${name}.tar`;
    this.$.dialog.appendChild(a);
    a.click();
    this.$.dialog.removeChild(a);
  }

  protected _computeName(snapshot) {
    return snapshot ? snapshot.name || snapshot.slug : "Unnamed snapshot";
  }

  protected _computeType(type) {
    return type === "full" ? "Full snapshot" : "Partial snapshot";
  }

  protected _computeSize(size) {
    return Math.ceil(size * 10) / 10 + " MB";
  }

  protected _sortAddons(a, b) {
    return a.name < b.name ? -1 : 1;
  }

  protected _formatDatetime(datetime) {
    return new Date(datetime).toLocaleDateString(navigator.language, {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  protected _dialogClosed() {
    this.setProperties({
      dialogParams: undefined,
      snapshot: undefined,
      _addons: [],
      _folders: [],
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-hassio-snapshot": HassioSnapshotDialog;
  }
}
