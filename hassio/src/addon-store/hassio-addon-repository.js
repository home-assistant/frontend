import "@polymer/paper-card/paper-card";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../components/hassio-card-content";
import "../resources/hassio-style";
import NavigateMixin from "../../../src/mixins/navigate-mixin";

class HassioAddonRepository extends NavigateMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="iron-flex ha-style hassio-style">
        paper-card {
          cursor: pointer;
        }
        .not_available {
          opacity: 0.6;
        }
        a.repo {
          display: block;
          color: var(--primary-text-color);
        }
      </style>
      <template is="dom-if" if="[[addons.length]]">
        <div class="card-group">
          <div class="title">
            [[repo.name]]
            <div class="description">
              Maintained by [[repo.maintainer]]
              <a class="repo" href="[[repo.url]]" target="_blank"
                >[[repo.url]]</a
              >
            </div>
          </div>
          <template
            is="dom-repeat"
            items="[[addons]]"
            as="addon"
            sort="sortAddons"
          >
            <paper-card on-click="addonTapped" class="[[computeClass(addon.available)]]">
              <div class="card-content">
                <hassio-card-content
                  hass="[[hass]]"
                  title="[[addon.name]]"
                  description="[[addon.description]]"
                  icon="[[computeIcon(addon)]]"
                  icon-title="[[computeIconTitle(addon)]]"
                  icon-class="[[computeIconClass(addon)]]"
                ></hassio-card-content>
              </div>
            </paper-card>
          </template>
        </div>
      </template>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      repo: Object,
      addons: Array,
    };
  }

  sortAddons(a, b) {
    return a.name.toUpperCase() < b.name.toUpperCase() ? -1 : 1;
  }

  computeIcon(addon) {
    return addon.installed && addon.installed !== addon.version
      ? "hassio:arrow-up-bold-circle"
      : "hassio:puzzle";
  }

  computeIconTitle(addon) {
    if (addon.installed)
      return addon.installed !== addon.version
        ? "New version available"
        : "Add-on is installed";
    return addon.available
      ? "Add-on is not installed"
      : "Add-on is not available on your system";
  }

  computeIconClass(addon) {
    if (addon.installed)
      return addon.installed !== addon.version ? "update" : "installed";
    return !addon.available ? "not_available" : "";
  }

  computeClass(available) {
    return !available ? "not_available" : "";
  }

  addonTapped(ev) {
    this.navigate(`/hassio/addon/${ev.model.addon.slug}`);
  }
}

customElements.define("hassio-addon-repository", HassioAddonRepository);
