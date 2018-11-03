import "@polymer/paper-button/paper-button";
import "@polymer/paper-card/paper-card";
import "@polymer/paper-checkbox/paper-checkbox";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-radio-button/paper-radio-button";
import "@polymer/paper-radio-group/paper-radio-group";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../components/hassio-card-content";
import "../resources/hassio-style";
import EventsMixin from "../../../src/mixins/events-mixin";

class HassioSnapshots extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="ha-style hassio-style">
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
    </style>
    <div class="content">
      <div class="card-group">
        <div class="title">
          Create snapshot
          <div class="description">
            Snapshots allow you to easily backup and
            restore all data of your Hass.io instance.
          </div>
        </div>
        <paper-card>
          <div class="card-content">
            <paper-input autofocus="" label="Name" value="{{snapshotName}}"></paper-input>
            Type:
            <paper-radio-group selected="{{snapshotType}}">
              <paper-radio-button name="full">
                Full snapshot
              </paper-radio-button>
              <paper-radio-button name="partial">
                Partial snapshot
              </paper-radio-button>
            </paper-radio-group>
            <template is="dom-if" if="[[!_fullSelected(snapshotType)]]">
              Folders:
              <template is="dom-repeat" items="[[folderList]]">
                <paper-checkbox checked="{{item.checked}}">
                  [[item.name]]
                </paper-checkbox>
              </template>
              Add-ons:
              <template is="dom-repeat" items="[[addonList]]" sort="_sortAddons">
                <paper-checkbox checked="{{item.checked}}">
                  [[item.name]]
                </paper-checkbox>
              </template>
            </template>
            Security:
            <paper-checkbox checked="{{snapshotHasPassword}}">Password protection</paper-checkbox>
            <template is="dom-if" if="[[snapshotHasPassword]]">
              <paper-input label="Password" type="password" value="{{snapshotPassword}}"></paper-input>
            </template>
            <template is="dom-if" if="[[error]]">
              <p class="error">[[error]]</p>
            </template>
          </div>
          <div class="card-actions">
            <paper-button disabled="[[creatingSnapshot]]" on-click="_createSnapshot">Create</paper-button>
          </div>
        </paper-card>
      </div>

      <div class="card-group">
        <div class="title">Available snapshots</div>
        <template is="dom-if" if="[[!snapshots.length]]">
          <paper-card>
            <div class="card-content">You don't have any snapshots yet.</div>
          </paper-card>
        </template>
        <template is="dom-repeat" items="[[snapshots]]" as="snapshot" sort="_sortSnapshots">
          <paper-card class="pointer" on-click="_snapshotClicked">
            <div class="card-content">
              <hassio-card-content hass="[[hass]]" title="[[_computeName(snapshot)]]" description="[[_computeDetails(snapshot)]]" datetime="[[snapshot.date]]" icon="[[_computeIcon(snapshot.type)]]" icon-class="snapshot"></hassio-card-content>
            </div>
          </paper-card>
        </template>
      </div>
    </div>
`;
  }

  static get properties() {
    return {
      hass: Object,
      snapshotName: {
        type: String,
        value: "",
      },
      snapshotPassword: {
        type: String,
        value: "",
      },
      snapshotHasPassword: Boolean,
      snapshotType: {
        type: String,
        value: "full",
      },
      snapshots: {
        type: Array,
        value: [],
      },
      installedAddons: {
        type: Array,
        observer: "_installedAddonsChanged",
      },
      addonList: Array,
      folderList: {
        type: Array,
        value: [
          {
            slug: "homeassistant",
            name: "Home Assistant configuration",
            checked: true,
          },
          { slug: "ssl", name: "SSL", checked: true },
          { slug: "share", name: "Share", checked: true },
          { slug: "addons/local", name: "Local add-ons", checked: true },
        ],
      },
      snapshotSlug: {
        type: String,
        notify: true,
      },
      snapshotDeleted: {
        type: Boolean,
        notify: true,
        observer: "_snapshotDeletedChanged",
      },
      creatingSnapshot: Boolean,
      dialogOpened: Boolean,
      error: String,
    };
  }

  ready() {
    super.ready();
    this.addEventListener("hass-api-called", (ev) => this._apiCalled(ev));
    this._updateSnapshots();
  }

  _apiCalled(ev) {
    if (ev.detail.success) {
      this._updateSnapshots();
    }
  }

  _updateSnapshots() {
    this.hass.callApi("get", "hassio/snapshots").then(
      (result) => {
        this.snapshots = result.data.snapshots;
      },
      (error) => {
        this.error = error.message;
      }
    );
  }

  _createSnapshot() {
    this.error = "";
    if (this.snapshotHasPassword && !this.snapshotPassword.length) {
      this.error = "Please enter a password.";
      return;
    }
    this.creatingSnapshot = true;
    let name = this.snapshotName;
    if (!name.length) {
      name = new Date().toLocaleDateString(navigator.language, {
        weekday: "long",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
    let data;
    let path;
    if (this.snapshotType === "full") {
      data = { name: name };
      path = "hassio/snapshots/new/full";
    } else {
      const addons = this.addonList
        .filter((addon) => addon.checked)
        .map((addon) => addon.slug);
      const folders = this.folderList
        .filter((folder) => folder.checked)
        .map((folder) => folder.slug);

      data = { name: name, folders: folders, addons: addons };
      path = "hassio/snapshots/new/partial";
    }
    if (this.snapshotHasPassword) {
      data.password = this.snapshotPassword;
    }

    this.hass.callApi("post", path, data).then(
      () => {
        this.creatingSnapshot = false;
        this.fire("hass-api-called", { success: true });
      },
      (error) => {
        this.creatingSnapshot = false;
        this.error = error.message;
      }
    );
  }

  _installedAddonsChanged(addons) {
    this.addonList = addons.map((addon) => ({
      slug: addon.slug,
      name: addon.name,
      checked: true,
    }));
  }

  _sortAddons(a, b) {
    return a.name < b.name ? -1 : 1;
  }

  _sortSnapshots(a, b) {
    return a.date < b.date ? 1 : -1;
  }

  _computeName(snapshot) {
    return snapshot.name || snapshot.slug;
  }

  _computeDetails(snapshot) {
    const type =
      snapshot.type === "full" ? "Full snapshot" : "Partial snapshot";
    return snapshot.protected ? `${type}, password protected` : type;
  }

  _computeIcon(type) {
    return type === "full"
      ? "hassio:package-variant-closed"
      : "hassio:package-variant";
  }

  _snapshotClicked(ev) {
    this.snapshotSlug = ev.model.snapshot.slug;
  }

  _fullSelected(type) {
    return type === "full";
  }

  _snapshotDeletedChanged(snapshotDeleted) {
    if (snapshotDeleted) {
      this._updateSnapshots();
      this.snapshotDeleted = false;
    }
  }

  refreshData() {
    this.hass.callApi("post", "hassio/snapshots/reload").then(() => {
      this._updateSnapshots();
    });
  }
}

customElements.define("hassio-snapshots", HassioSnapshots);
