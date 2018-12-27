import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-icon-button/paper-icon-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../layouts/ha-app-layout";
import "../../../resources/ha-style";

import "./zha-network";
import "./zha-node";

/*
 * @appliesMixin LocalizeMixin
 */
class HaConfigZha extends PolymerElement {
  static get template() {
    return html`
      <style include="iron-flex ha-style ha-form-style">
        .content {
          margin-top: 24px;
        }

        .node-info {
          margin-left: 16px;
        }

        .help-text {
          padding-left: 24px;
          padding-right: 24px;
        }

        paper-card {
          display: block;
          margin: 0 auto;
          max-width: 600px;
        }

        ha-service-description {
          display: block;
          color: grey;
        }

        [hidden] {
          display: none;
        }

        .toggle-help-icon {
          position: absolute;
          top: 6px;
          right: 0;
          color: var(--primary-color);
        }
      </style>
      <ha-app-layout has-scrolling-region="">
        <app-header slot="header" fixed="">
          <app-toolbar>
            <paper-icon-button
              icon="hass:arrow-left"
              on-click="_backTapped"
            ></paper-icon-button>
            <div main-title="">[[localize('ui.panel.config.zha.caption')]]</div>
          </app-toolbar>
        </app-header>

        <zha-network
          id="zha-network"
          is-wide="[[isWide]]"
          hass="[[hass]]"
        ></zha-network>
        <zha-node id="zha-node" is-wide="[[isWide]]" hass="[[hass]]"></zha-node>
      </ha-app-layout>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      isWide: Boolean,

      config: {
        type: Array,
        value: function() {
          return [];
        },
      },

      showHelp: {
        type: Boolean,
        value: false,
      },
    };
  }

  toggleHelp() {
    this.showHelp = !this.showHelp;
  }

  _backTapped() {
    history.back();
  }
}

customElements.define("ha-config-zha", HaConfigZha);
