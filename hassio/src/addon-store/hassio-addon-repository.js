import '@polymer/paper-card/paper-card.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../components/hassio-card-content.js';
import '../resources/hassio-style.js';
import NavigateMixin from '../../../src/mixins/navigate-mixin.js';

class HassioAddonRepository extends NavigateMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="iron-flex ha-style hassio-style">
      paper-card {
        cursor: pointer;
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
            <a class="repo" href="[[repo.url]]" target="_blank">[[repo.url]]</a>
          </div>
        </div>
        <template is="dom-repeat" items="[[addons]]" as="addon" sort="sortAddons">
          <paper-card on-click="addonTapped">
            <div class="card-content">
              <hassio-card-content hass="[[hass]]" title="[[addon.name]]" description="[[addon.description]]" icon="[[computeIcon(addon)]]" icon-title="[[computeIconTitle(addon)]]" icon-class="[[computeIconClass(addon)]]"></hassio-card-content>
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
    return a.name < b.name ? -1 : 1;
  }

  computeIcon(addon) {
    return addon.installed && addon.installed !== addon.version ? 'hassio:arrow-up-bold-circle' : 'hassio:puzzle';
  }

  computeIconTitle(addon) {
    if (addon.installed) return addon.installed !== addon.version ? 'New version available' : 'Add-on is installed';
    return 'Add-on is not installed';
  }

  computeIconClass(addon) {
    if (addon.installed) return addon.installed !== addon.version ? 'update' : 'installed';
    return '';
  }

  addonTapped(ev) {
    this.navigate(`/hassio/addon/${ev.model.addon.slug}`);
  }
}

customElements.define('hassio-addon-repository', HassioAddonRepository);
