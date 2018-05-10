import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-card/paper-card.js';
import '../../src/util/hass-mixins.js';
import '../../src/components/hassio-card-content.js';
import '../../src/resources/hassio-style.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
class HassioAddons extends window.hassMixins.NavigateMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="ha-style hassio-style">
      paper-card {
        cursor: pointer;
      }
    </style>
    <div class="content card-group">
      <div class="title">Add-ons</div>
      <template is="dom-if" if="[[!addons.length]]">
        <paper-card>
          <div class="card-content">
            You don't have any add-ons installed yet. Head over to <a href="#" on-click="openStore">the add-on store</a> to get started!
          </div>
        </paper-card>
      </template>
      <template is="dom-repeat" items="[[addons]]" as="addon" sort="sortAddons">
        <paper-card on-click="addonTapped">
          <div class="card-content">
            <hassio-card-content title="[[addon.name]]" description="[[addon.description]]" icon="[[computeIcon(addon)]]" icon-title="[[computeIconTitle(addon)]]" icon-class="[[computeIconClass(addon)]]"></hassio-card-content>
          </div>
        </paper-card>
      </template>
    </div>
`;
  }

  static get is() { return 'hassio-addons'; }

  static get properties() {
    return {
      hass: Object,
      addons: Array,
    };
  }

  sortAddons(a, b) {
    return a.name < b.name ? -1 : 1;
  }

  computeIcon(addon) {
    return addon.installed !== addon.version ? 'mdi:arrow-up-bold-circle' : 'mdi:puzzle';
  }

  computeIconTitle(addon) {
    if (addon.installed !== addon.version) return 'New version available';
    return addon.state === 'started' ? 'Add-on is running' : 'Add-on is stopped';
  }

  computeIconClass(addon) {
    if (addon.installed !== addon.version) return 'update';
    return addon.state === 'started' ? 'running' : '';
  }

  addonTapped(ev) {
    this.navigate('/hassio/addon/' + ev.model.addon.slug);
    ev.target.blur();
  }

  openStore(ev) {
    this.navigate('/hassio/store');
    ev.target.blur();
  }
}

customElements.define(HassioAddons.is, HassioAddons);
