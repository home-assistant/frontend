import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-card/paper-card.js';
import '../../../src/components/buttons/ha-call-service-button.js';
import '../../../src/resources/ha-style.js';
import '../../../src/util/hass-mixins.js';
import '../ha-config-section.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
/*
 * @appliesMixin window.hassMixins.LocalizeMixin
 */
class HaConfigSectionCore extends window.hassMixins.LocalizeMixin(PolymerElement) {
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

      .config-invalid paper-button {
        float: right;
      }

      .validate-log {
        white-space: pre-wrap;
      }
    </style>
    <ha-config-section is-wide="[[isWide]]">
      <span slot="header">[[localize('ui.panel.config.core.section.core.header')]]</span>
      <span slot="introduction">[[localize('ui.panel.config.core.section.core.introduction')]]</span>

      <paper-card heading="[[localize('ui.panel.config.core.section.core.validation.heading')]]">
        <div class="card-content">
          [[localize('ui.panel.config.core.section.core.validation.introduction')]]
          <template is="dom-if" if="[[!validateLog]]">
            <div class="validate-container">
              <template is="dom-if" if="[[!validating]]">
                <template is="dom-if" if="[[isValid]]">
                  <div class="validate-result" id="result">
                    [[localize('ui.panel.config.core.section.core.validation.valid')]]
                  </div>
                </template>
                <paper-button raised="" on-click="validateConfig">
                  [[localize('ui.panel.config.core.section.core.validation.check_config')]]
                </paper-button>
              </template>
              <template is="dom-if" if="[[validating]]">
                <paper-spinner active=""></paper-spinner>
              </template>
            </div>
          </template>
          <template is="dom-if" if="[[validateLog]]">
            <div class="config-invalid">
              <span class="text">
                [[localize('ui.panel.config.core.section.core.validation.invalid')]]
              </span>
              <paper-button raised="" on-click="validateConfig">
                [[localize('ui.panel.config.core.section.core.validation.check_config')]]
              </paper-button>
            </div>
            <div id="configLog" class="validate-log">[[validateLog]]</div>
          </template>
        </div>
      </paper-card>

      <paper-card heading="[[localize('ui.panel.config.core.section.core.reloading.heading')]]">
        <div class="card-content">
          [[localize('ui.panel.config.core.section.core.reloading.introduction')]]
        </div>
        <div class="card-actions">
          <ha-call-service-button hass="[[hass]]" domain="homeassistant" service="reload_core_config">[[localize('ui.panel.config.core.section.core.reloading.core')]]
          </ha-call-service-button>
          <ha-call-service-button hass="[[hass]]" domain="group" service="reload" hidden\$="[[!groupLoaded(hass)]]">[[localize('ui.panel.config.core.section.core.reloading.group')]]
          </ha-call-service-button>
          <ha-call-service-button hass="[[hass]]" domain="automation" service="reload" hidden\$="[[!automationLoaded(hass)]]">[[localize('ui.panel.config.core.section.core.reloading.automation')]]
          </ha-call-service-button>
          <ha-call-service-button hass="[[hass]]" domain="script" service="reload" hidden\$="[[!scriptLoaded(hass)]]">[[localize('ui.panel.config.core.section.core.reloading.script')]]
          </ha-call-service-button>
        </div>
      </paper-card>

      <paper-card heading="[[localize('ui.panel.config.core.section.core.server_management.heading')]]">
        <div class="card-content">
          [[localize('ui.panel.config.core.section.core.server_management.introduction')]]
        </div>
        <div class="card-actions warning">
          <ha-call-service-button class="warning" hass="[[hass]]" domain="homeassistant" service="restart">[[localize('ui.panel.config.core.section.core.server_management.restart')]]
          </ha-call-service-button>
          <ha-call-service-button class="warning" hass="[[hass]]" domain="homeassistant" service="stop">[[localize('ui.panel.config.core.section.core.server_management.stop')]]
          </ha-call-service-button>
        </div>
      </paper-card>

    </ha-config-section>
`;
  }

  static get is() { return 'ha-config-section-core'; }

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
        value: '',
      },
    };
  }

  groupLoaded(hass) {
    return window.hassUtil.isComponentLoaded(hass, 'group');
  }

  automationLoaded(hass) {
    return window.hassUtil.isComponentLoaded(hass, 'automation');
  }

  scriptLoaded(hass) {
    return window.hassUtil.isComponentLoaded(hass, 'script');
  }

  validateConfig() {
    this.validating = true;
    this.validateLog = '';
    this.isValid = null;

    this.hass.callApi('POST', 'config/core/check_config').then((result) => {
      this.validating = false;
      this.isValid = result.result === 'valid';

      if (!this.isValid) {
        this.validateLog = result.errors;
      }
    });
  }
}

customElements.define(HaConfigSectionCore.is, HaConfigSectionCore);
