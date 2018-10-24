import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "./hassio-addon-repository.js";
import "./hassio-repositories-editor.js";

class HassioAddonStore extends PolymerElement {
  static get template() {
    return html`
    <style include="iron-flex ha-style">
      hassio-addon-repository {
        margin-top: 24px;
      }
    </style>
    <hassio-repositories-editor hass="[[hass]]" repos="[[repos]]"></hassio-repositories-editor>

    <template is="dom-repeat" items="[[repos]]" as="repo" sort="sortRepos">
      <hassio-addon-repository hass="[[hass]]" repo="[[repo]]" addons="[[computeAddons(repo.slug)]]"></hassio-addon-repository>
    </template>
`;
  }

  static get properties() {
    return {
      hass: Object,
      addons: Array,
      repos: Array,
    };
  }

  ready() {
    super.ready();
    this.addEventListener("hass-api-called", (ev) => this.apiCalled(ev));
    this.loadData();
  }

  apiCalled(ev) {
    if (ev.detail.success) {
      this.loadData();
    }
  }

  sortRepos(a, b) {
    if (a.slug === "local") {
      return -1;
    }
    if (b.slug === "local") {
      return 1;
    }
    if (a.slug === "core") {
      return -1;
    }
    if (b.slug === "core") {
      return 1;
    }
    return a.name.toUpperCase() < b.name.toUpperCase() ? -1 : 1;
  }

  computeAddons(repo) {
    return this.addons.filter(function(addon) {
      return addon.repository === repo;
    });
  }

  loadData() {
    this.hass.callApi("get", "hassio/addons").then(
      (info) => {
        this.addons = info.data.addons;
        this.repos = info.data.repositories;
      },
      () => {
        this.addons = [];
        this.repos = [];
      }
    );
  }

  refreshData() {
    this.hass.callApi("post", "hassio/addons/reload").then(() => {
      this.loadData();
    });
  }
}

customElements.define("hassio-addon-store", HassioAddonStore);
