import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../src/util/hass-mixins.js';
import '../ha-config-section.js';

/*
 * @appliesMixin window.hassMixins.LocalizeMixin
 * @appliesMixin window.hassMixins.EventsMixin
 */
class HaConfigSectionThemes extends
  window.hassMixins.LocalizeMixin(window.hassMixins.EventsMixin(PolymerElement)) {
  static get template() {
    return html`
    <ha-config-section is-wide="[[isWide]]">
      <span slot="header">[[localize('ui.panel.config.core.section.themes.header')]]</span>
      <span slot="introduction">
        [[localize('ui.panel.config.core.section.themes.introduction')]]
      </span>

      <paper-card>
        <div class="card-content">
          <paper-dropdown-menu label="[[localize('ui.panel.config.core.section.themes.header')]]" dynamic-align="">
            <paper-listbox slot="dropdown-content" selected="{{selectedTheme}}">
              <template is="dom-repeat" items="[[themes]]" as="theme">
                <paper-item>[[theme]]</paper-item>
              </template>
            </paper-listbox>
          </paper-dropdown-menu>
        </div>
      </paper-card>
    </ha-config-section>
`;
  }

  static get is() { return 'ha-config-section-themes'; }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      isWide: {
        type: Boolean,
      },

      themes: {
        type: Array,
        computed: 'computeThemes(hass)',
      },

      selectedTheme: {
        type: Number,
      },
    };
  }

  static get observers() {
    return [
      'selectionChanged(hass, selectedTheme)',
    ];
  }

  ready() {
    super.ready();
    if (this.hass.selectedTheme && this.themes.indexOf(this.hass.selectedTheme) > 0) {
      this.selectedTheme = this.themes.indexOf(this.hass.selectedTheme);
    } else if (!this.hass.selectedTheme) {
      this.selectedTheme = 0;
    }
  }

  computeThemes(hass) {
    if (!hass) return [];
    return ['Backend-selected', 'default'].concat(Object.keys(hass.themes.themes).sort());
  }

  selectionChanged(hass, selection) {
    if (selection > 0 && selection < this.themes.length) {
      if (hass.selectedTheme !== this.themes[selection]) {
        this.fire('settheme', this.themes[selection]);
      }
    } else if (selection === 0 && hass.selectedTheme !== '') {
      this.fire('settheme', '');
    }
  }
}

customElements.define(HaConfigSectionThemes.is, HaConfigSectionThemes);
