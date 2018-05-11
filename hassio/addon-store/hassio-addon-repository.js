import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-card/paper-card.js';
import '../../src/util/hass-mixins.js';
import '../../src/components/hassio-card-content.js';
import '../../src/resources/hassio-style.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

class HassioAddonRepository extends window.hassMixins.NavigateMixin(PolymerElement) {
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
              <hassio-card-content title="[[addon.name]]" description="[[addon.description]]" icon="[[computeIcon(addon)]]" icon-title="[[computeIconTitle(addon)]]" icon-class="[[computeIconClass(addon)]]"></hassio-card-content>
            </div>
          </paper-card>
        </template>
      </div>
    </template>
`;
  }

  static get is() { return 'hassio-addon-repository'; }

  static get properties() {
    return {
      repo: Object,
      addons: Array,
    };
  }

  sortAddons(a, b) {
    return a.name < b.name ? -1 : 1;
  }

  computeIcon(addon) {
    return addon.installed && addon.installed !== addon.version ? 'mdi:arrow-up-bold-circle' : 'mdi:puzzle';
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

customElements.define(HassioAddonRepository.is, HassioAddonRepository);
