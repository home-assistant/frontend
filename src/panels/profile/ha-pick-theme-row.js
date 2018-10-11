import "@polymer/paper-card/paper-card.js";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu.js";
import "@polymer/paper-item/paper-item.js";
import "@polymer/paper-listbox/paper-listbox.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import EventsMixin from "../../mixins/events-mixin.js";
import LocalizeMixin from "../../mixins/localize-mixin.js";

/*
 * @appliesMixin LocalizeMixin
 * @appliesMixin EventsMixin
 */
class HaPickThemeRow extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
    <style>
      a { color: var(--primary-color); }
    </style>
    <ha-settings-row narrow='[[narrow]]'>
      <span slot='heading'>[[localize('ui.panel.profile.themes.header')]]</span>
      <span slot='description'>
        <template is='dom-if' if='[[!_hasThemes]]'>
        [[localize('ui.panel.profile.themes.error_no_theme')]]
        </template>
        <a
          href='https://www.home-assistant.io/components/frontend/#defining-themes'
          target='_blank'>[[localize('ui.panel.profile.themes.link_promo')]]</a>
      </span>
      <paper-dropdown-menu
        label="[[localize('ui.panel.profile.themes.dropdown_label')]]"
        dynamic-align
        disabled='[[!_hasThemes]]'
      >
        <paper-listbox slot="dropdown-content" selected="{{selectedTheme}}">
          <template is="dom-repeat" items="[[themes]]" as="theme">
            <paper-item>[[theme]]</paper-item>
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
      _hasThemes: {
        type: Boolean,
        computed: "_compHasThemes(hass)",
      },
      themes: {
        type: Array,
        computed: "_computeThemes(hass)",
      },
      selectedTheme: {
        type: Number,
      },
    };
  }

  static get observers() {
    return ["selectionChanged(hass, selectedTheme)"];
  }

  _compHasThemes(hass) {
    return (
      hass.themes &&
      hass.themes.themes &&
      Object.keys(hass.themes.themes).length
    );
  }

  ready() {
    super.ready();
    if (
      this.hass.selectedTheme &&
      this.themes.indexOf(this.hass.selectedTheme) > 0
    ) {
      this.selectedTheme = this.themes.indexOf(this.hass.selectedTheme);
    } else if (!this.hass.selectedTheme) {
      this.selectedTheme = 0;
    }
  }

  _computeThemes(hass) {
    if (!hass) return [];
    return ["Backend-selected", "default"].concat(
      Object.keys(hass.themes.themes).sort()
    );
  }

  selectionChanged(hass, selection) {
    if (selection > 0 && selection < this.themes.length) {
      if (hass.selectedTheme !== this.themes[selection]) {
        this.fire("settheme", this.themes[selection]);
      }
    } else if (selection === 0 && hass.selectedTheme !== "") {
      this.fire("settheme", "");
    }
  }
}

customElements.define("ha-pick-theme-row", HaPickThemeRow);
