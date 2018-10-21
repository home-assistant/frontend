import "@polymer/paper-card/paper-card.js";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu.js";
import "@polymer/paper-item/paper-item.js";
import "@polymer/paper-listbox/paper-listbox.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import EventsMixin from "../../mixins/events-mixin.js";
import LocalizeMixin from "../../mixins/localize-mixin.js";

import "./ha-settings-row.js";

/*
 * @appliesMixin LocalizeMixin
 * @appliesMixin EventsMixin
 */
class HaPickLanguageRow extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
    <style>
      a { color: var(--primary-color); }
    </style>
    <ha-settings-row narrow='[[narrow]]'>
      <span slot='heading'>[[localize('ui.panel.profile.language.header')]]</span>
      <span slot='description'>
        <a
          href='https://developers.home-assistant.io/docs/en/internationalization_translation.html'
          target='_blank'>[[localize('ui.panel.profile.language.link_promo')]]</a>
      </span>
      <paper-dropdown-menu label="[[localize('ui.panel.profile.language.dropdown_label')]]" dynamic-align="">
        <paper-listbox slot="dropdown-content" attr-for-selected="language-tag" selected="{{languageSelection}}">
          <template is="dom-repeat" items="[[languages]]">
            <paper-item language-tag$="[[item.tag]]">[[item.nativeName]]</paper-item>
          </template>
        </paper-listbox>
      </paper-dropdown-menu>
    </ha-settings-row>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      narrow: Boolean,
      languageSelection: {
        type: String,
        observer: "languageSelectionChanged",
      },
      languages: {
        type: Array,
        computed: "computeLanguages(hass)",
      },
    };
  }

  static get observers() {
    return ["setLanguageSelection(language)"];
  }

  computeLanguages(hass) {
    if (!hass || !hass.translationMetadata) {
      return [];
    }
    return Object.keys(hass.translationMetadata.translations).map((key) => ({
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
    if (newVal !== this.hass.language) {
      this.fire("hass-language-select", { language: newVal });
    }
  }

  ready() {
    super.ready();
    if (this.hass && this.hass.language) {
      this.setLanguageSelection(this.hass.language);
    }
  }
}

customElements.define("ha-pick-language-row", HaPickLanguageRow);
