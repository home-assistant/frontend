import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../components/ha-paper-dropdown-menu";

import { EventsMixin } from "../../mixins/events-mixin";
import LocalizeMixin from "../../mixins/localize-mixin";

/*
 * @appliesMixin LocalizeMixin
 * @appliesMixin EventsMixin
 */
class HaPickThemeRow extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
      <style>
        a {
          color: var(--primary-color);
        }
      </style>
      <ha-settings-row narrow="[[narrow]]">
        <span slot="heading"
          >[[localize('ui.panel.profile.themes.header')]]</span
        >
        <span slot="description">
          <template is="dom-if" if="[[!_hasThemes]]">
            [[localize('ui.panel.profile.themes.error_no_theme')]]
          </template>
          <a
            href="https://www.home-assistant.io/integrations/frontend/#defining-themes"
            target="_blank"
            rel="noreferrer"
            >[[localize('ui.panel.profile.themes.link_promo')]]</a
          >
        </span>
        <ha-paper-dropdown-menu
          label="[[localize('ui.panel.profile.themes.dropdown_label')]]"
          dynamic-align
          disabled="[[!_hasThemes]]"
        >
          <paper-listbox slot="dropdown-content" selected="{{selectedTheme}}">
            <template is="dom-repeat" items="[[themes]]" as="theme">
              <paper-item>[[theme]]</paper-item>
            </template>
          </paper-listbox>
        </ha-paper-dropdown-menu>
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
