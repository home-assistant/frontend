import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-icon-button/paper-icon-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../layouts/hass-tabs-subpage";
import "../../../resources/ha-style";

import "./ha-config-section-server-control";

import LocalizeMixin from "../../../mixins/localize-mixin";
import { configSections } from "../ha-panel-config";

/*
 * @appliesMixin LocalizeMixin
 */
class HaConfigServerControl extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="iron-flex ha-style">
        .content {
          padding-bottom: 32px;
        }

        .border {
          margin: 32px auto 0;
          border-bottom: 1px solid rgba(0, 0, 0, 0.12);
          max-width: 1040px;
        }

        .narrow .border {
          max-width: 640px;
        }
      </style>

      <hass-tabs-subpage
        hass="[[hass]]"
        narrow="[[narrow]]"
        route="[[route]]"
        back-path="/config"
        tabs="[[_computeTabs()]]"
        show-advanced="[[showAdvanced]]"
      >
        <div class$="[[computeClasses(isWide)]]">
          <ha-config-section-server-control
            is-wide="[[isWide]]"
            show-advanced="[[showAdvanced]]"
            hass="[[hass]]"
          ></ha-config-section-server-control>
        </div>
      </hass-tabs-subpage>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      isWide: Boolean,
      narrow: Boolean,
      route: Object,
      showAdvanced: Boolean,
    };
  }

  _computeTabs() {
    return configSections.general;
  }

  computeClasses(isWide) {
    return isWide ? "content" : "content narrow";
  }
}

customElements.define("ha-config-server-control", HaConfigServerControl);
