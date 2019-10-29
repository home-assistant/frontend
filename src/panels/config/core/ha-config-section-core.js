import "@material/mwc-button";
import "@polymer/paper-input/paper-input";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../components/ha-card";
import "../../../components/buttons/ha-call-service-button";
import "../../../resources/ha-style";

import "../ha-config-section";

import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import LocalizeMixin from "../../../mixins/localize-mixin";

import "./ha-config-name-form";
import "./ha-config-core-form";

/*
 * @appliesMixin LocalizeMixin
 */
class HaConfigSectionCore extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="iron-flex ha-style">
        .validate-container {
          @apply --layout-vertical;
          @apply --layout-center-center;
          height: 140px;
        }

        .validate-result {
          color: var(--google-green-500);
          font-weight: 500;
          margin-bottom: 1em;
        }

        .config-invalid {
          margin: 1em 0;
        }

        .config-invalid .text {
          color: var(--google-red-500);
          font-weight: 500;
        }

        .config-invalid mwc-button {
          float: right;
        }

        .validate-log {
          white-space: pre-wrap;
          direction: ltr;
        }
      </style>
      <ha-config-section is-wide="[[isWide]]">
        <span slot="header"
          >[[localize('ui.panel.config.core.section.core.header')]]</span
        >
        <span slot="introduction"
          >[[localize('ui.panel.config.core.section.core.introduction')]]</span
        >

        <ha-config-name-form hass="[[hass]]"></ha-config-name-form>
        <ha-config-core-form hass="[[hass]]"></ha-config-core-form>
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

  groupLoaded(hass) {
    return isComponentLoaded(hass, "group");
  }

  automationLoaded(hass) {
    return isComponentLoaded(hass, "automation");
  }

  scriptLoaded(hass) {
    return isComponentLoaded(hass, "script");
  }

  validateConfig() {
    this.validating = true;
    this.validateLog = "";
    this.isValid = null;

    this.hass.callApi("POST", "config/core/check_config").then((result) => {
      this.validating = false;
      this.isValid = result.result === "valid";

      if (!this.isValid) {
        this.validateLog = result.errors;
      }
    });
  }
}

customElements.define("ha-config-section-core", HaConfigSectionCore);
