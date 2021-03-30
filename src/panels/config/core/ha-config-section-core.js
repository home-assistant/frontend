import "@material/mwc-button";
import "@polymer/paper-input/paper-input";
import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import "../../../components/buttons/ha-call-service-button";
import "../../../components/ha-card";
import LocalizeMixin from "../../../mixins/localize-mixin";
import "../../../styles/polymer-ha-style";
import "../ha-config-section";
import "./ha-config-analytics";
import "./ha-config-core-form";
import "./ha-config-name-form";
import "./ha-config-url-form";

/*
 * @appliesMixin LocalizeMixin
 */
class HaConfigSectionCore extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <ha-config-section is-wide="[[isWide]]">
        <span slot="header"
          >[[localize('ui.panel.config.core.section.core.header')]]</span
        >
        <span slot="introduction"
          >[[localize('ui.panel.config.core.section.core.introduction')]]</span
        >

        <ha-config-name-form hass="[[hass]]"></ha-config-name-form>
        <ha-config-core-form hass="[[hass]]"></ha-config-core-form>
        <ha-config-url-form hass="[[hass]]"></ha-config-url-form>
        <ha-config-analytics hass="[[hass]]"></ha-config-analytics>
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
        value: false,
      },

      validating: {
        type: Boolean,
        value: false,
      },

      isValid: {
        type: Boolean,
        value: null,
      },

      validateLog: {
        type: String,
        value: "",
      },

      showAdvanced: Boolean,
    };
  }
}

customElements.define("ha-config-section-core", HaConfigSectionCore);
