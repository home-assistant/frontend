import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-button/paper-button";
import "@polymer/paper-checkbox/paper-checkbox";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "@polymer/paper-dialog/paper-dialog";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-input/paper-input";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../src/resources/ha-style";

class HassioSnapshot extends PolymerElement {
  static get template() {
    return html`
    <style include="ha-style-dialog">
      paper-dialog {
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
      paper-dialog-scrollable {
        margin: 0;
      }
      paper-checkbox {
        display: block;
        margin: 4px;
      }
      @media all and (max-width: 450px), all and (max-height: 500px) {
        paper-dialog {
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
      .download {
        color: var(--primary-color);
      }
      .warning,
      .error {
        color: var(--google-red-500);
      }
    </style>
    <paper-dialog id="dialog" with-backdrop="" on-iron-overlay-closed="_dialogClosed">
      <app-toolbar>
        <paper-icon-button icon="hassio:close" dialog-dismiss=""></paper-icon-button>
        <div main-title="">[[_computeName(snapshot)]]</div>
      </app-toolbar>
      <div class="details">
        [[_computeType(snapshot.type)]] ([[_computeSize(snapshot.size)]])<br>
        [[_formatDatetime(snapshot.date)]]
      </div>
      <div>Home Assistant:</div>
      <paper-checkbox checked="{{restoreHass}}">
        Home Assistant [[snapshot.homeassistant]]
      </paper-checkbox>
      <template is="dom-if" if="[[snapshot.addons.length]]">
        <div>Folders:</div>
        <template is="dom-repeat" items="[[snapshot.folders]]">
          <paper-checkbox checked="{{item.checked}}">
            [[item.name]]
          </paper-checkbox>
        </template>
      </template>
      <template is="dom-if" if="[[snapshot.addons.length]]">
        <div>Add-ons:</div>
        <paper-dialog-scrollable>
          <template is="dom-repeat" items="[[snapshot.addons]]" sort="_sortAddons">
            <paper-checkbox checked="{{item.checked}}">
              [[item.name]]
              <span class="details">([[item.version]])</span>
            </paper-checkbox>
          </template>
        </paper-dialog-scrollable>
      </template>
      <template is="dom-if" if="[[snapshot.protected]]">
        <paper-input autofocus="" label="Password" type="password" value="{{snapshotPassword}}"></paper-input>
      </template>
      <template is="dom-if" if="[[error]]">
        <p class="error">Error: [[error]]</p>
      </template>
      <div class="buttons">
        <paper-icon-button icon="hassio:delete" on-click="_deleteClicked" class="warning" title="Delete snapshot"></paper-icon-button>
        <a href="[[_computeDownloadUrl(snapshotSlug)]]" download="[[_computeDownloadName(snapshot)]]">
          <paper-icon-button icon="hassio:download" class="download" title="Download snapshot"></paper-icon-button>
        </a>
        <paper-button on-click="_partialRestoreClicked">Restore selected</paper-button>
        <template is="dom-if" if="[[_isFullSnapshot(snapshot.type)]]">
          <paper-button on-click="_fullRestoreClicked">Wipe &amp; restore</paper-button>
        </template>
      </div>
    </paper-dialog>
`;
  }

  static get properties() {
    return {
      hass: Object,
      snapshotSlug: {
        type: String,
        notify: true,
        observer: "_snapshotSlugChanged",
      },
      snapshotDeleted: {
        type: Boolean,
        notify: true,
      },
      snapshot: Object,
      restoreHass: {
        type: Boolean,
        value: true,
      },
      snapshotPassword: String,
      error: String,
    };
  }

  _snapshotSlugChanged(snapshotSlug) {
    if (!snapshotSlug || snapshotSlug === "update") return;
    this.hass.callApi("get", `hassio/snapshots/${snapshotSlug}/info`).then(
      (info) => {
        info.data.folders = this._computeFolders(info.data.folders);
        info.data.addons = this._computeAddons(info.data.addons);
        this.snapshot = info.data;
        this.$.dialog.open();
      },
      () => {
        this.snapshot = null;
      }
    );
  }

  _computeFolders(folders) {
    const list = [];
    if (folders.includes("homeassistant"))
      list.push({
        slug: "homeassistant",
        name: "Home Assistant configuration",
        checked: true,
      });
    if (folders.includes("ssl"))
      list.push({ slug: "ssl", name: "SSL", checked: true });
    if (folders.includes("share"))
      list.push({ slug: "share", name: "Share", checked: true });
    if (folders.includes("addons/local"))
      list.push({ slug: "addons/local", name: "Local add-ons", checked: true });
    return list;
  }

  _computeAddons(addons) {
    return addons.map((addon) => ({
      slug: addon.slug,
      name: addon.name,
      version: addon.version,
      checked: true,
    }));
  }

  _isFullSnapshot(type) {
    return type === "full";
  }

  _partialRestoreClicked() {
    if (!confirm("Are you sure you want to restore this snapshot?")) {
      return;
    }
    const addons = this.snapshot.addons
      .filter((addon) => addon.checked)
      .map((addon) => addon.slug);
    const folders = this.snapshot.folders
      .filter((folder) => folder.checked)
      .map((folder) => folder.slug);

    const data = {
      homeassistant: this.restoreHass,
      addons: addons,
      folders: folders,
    };
    if (this.snapshot.protected) data.password = this.snapshotPassword;

    this.hass
      .callApi(
        "post",
        `hassio/snapshots/${this.snapshotSlug}/restore/partial`,
        data
      )
      .then(
        () => {
          alert("Snapshot restored!");
          this.$.dialog.close();
        },
        (error) => {
          this.error = error.body.message;
        }
      );
  }

  _fullRestoreClicked() {
    if (!confirm("Are you sure you want to restore this snapshot?")) {
      return;
    }
    const data = this.snapshot.protected
      ? { password: this.snapshotPassword }
      : null;
    this.hass
      .callApi(
        "post",
        `hassio/snapshots/${this.snapshotSlug}/restore/full`,
        data
      )
      .then(
        () => {
          alert("Snapshot restored!");
          this.$.dialog.close();
        },
        (error) => {
          this.error = error.body.message;
        }
      );
  }

  _deleteClicked() {
    if (!confirm("Are you sure you want to delete this snapshot?")) {
      return;
    }
    this.hass
      .callApi("post", `hassio/snapshots/${this.snapshotSlug}/remove`)
      .then(
        () => {
          this.$.dialog.close();
          this.snapshotDeleted = true;
        },
        (error) => {
          this.error = error.body.message;
        }
      );
  }

  _computeDownloadUrl(snapshotSlug) {
    const password = encodeURIComponent(this.hass.connection.options.authToken);
    return `/api/hassio/snapshots/${snapshotSlug}/download?api_password=${password}`;
  }

  _computeDownloadName(snapshot) {
    const name = this._computeName(snapshot).replace(/[^a-z0-9]+/gi, "_");
    return `Hass_io_${name}.tar`;
  }

  _computeName(snapshot) {
    return snapshot.name || snapshot.slug;
  }

  _computeType(type) {
    return type === "full" ? "Full snapshot" : "Partial snapshot";
  }

  _computeSize(size) {
    return Math.ceil(size * 10) / 10 + " MB";
  }

  _sortAddons(a, b) {
    return a.name < b.name ? -1 : 1;
  }

  _formatDatetime(datetime) {
    return new Date(datetime).toLocaleDateString(navigator.language, {
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  _dialogClosed() {
    this.snapshotSlug = null;
  }
}
customElements.define("hassio-snapshot", HassioSnapshot);
