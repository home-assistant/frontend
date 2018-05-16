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
class HaConfigSectionTranslation extends
  window.hassMixins.LocalizeMixin(window.hassMixins.EventsMixin(PolymerElement)) {
  static get template() {
    return html`
    <ha-config-section is-wide="[[isWide]]">
      <span slot="header">[[localize('ui.panel.config.core.section.translation.header')]]</span>
      <span slot="introduction">
        [[localize('ui.panel.config.core.section.translation.introduction')]]
      </span>

      <paper-card>
        <div class="card-content">
          <paper-dropdown-menu label="[[localize('ui.panel.config.core.section.translation.language')]]" dynamic-align="">
            <paper-listbox slot="dropdown-content" attr-for-selected="language-tag" selected="{{languageSelection}}">
              <template is="dom-repeat" items="[[languages]]">
                <paper-item language-tag\$="[[item.tag]]">[[item.nativeName]]</paper-item>
              </template>
            </paper-listbox>
          &gt;</paper-dropdown-menu>
        </div>
      </paper-card>
    </ha-config-section>
`;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      isWide: {
        type: Boolean,
      },
      languageSelection: {
        type: String,
        observer: 'languageSelectionChanged',
      },
      languages: {
        type: Array,
        computed: 'computeLanguages(hass)',
      },
    };
  }
  static get observers() { return ['setLanguageSelection(language)']; }

  computeLanguages(hass) {
    if (!hass || !hass.translationMetadata) {
      return [];
    }
    return Object.keys(hass.translationMetadata.translations).map(key => ({
      tag: key,
      nativeName: hass.translationMetadata.translations[key].nativeName,
    }));
  }

  setLanguageSelection(language) {
    this.languageSelection = language;
  }

  languageSelectionChanged(newVal) {
    // Only fire event if language was changed. This prevents select updates when
    // responding to hass changes.
    if (newVal !== this.language) {
      this.fire('hass-language-select', { language: newVal });
    }
  }
}

customElements.define('ha-config-section-translation', HaConfigSectionTranslation);
