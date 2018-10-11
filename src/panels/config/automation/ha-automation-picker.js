import "@polymer/app-layout/app-header/app-header.js";
import "@polymer/app-layout/app-toolbar/app-toolbar.js";
import "@polymer/paper-card/paper-card.js";
import "@polymer/paper-fab/paper-fab.js";
import "@polymer/paper-icon-button/paper-icon-button.js";
import "@polymer/paper-item/paper-item-body.js";
import "@polymer/paper-item/paper-item.js";
import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";

import "../../../components/ha-markdown.js";
import "../../../layouts/ha-app-layout.js";

import "../ha-config-section.js";

import NavigateMixin from "../../../mixins/navigate-mixin.js";
import LocalizeMixin from "../../../mixins/localize-mixin.js";
import computeStateName from "../../../common/entity/compute_state_name.js";
/*
 * @appliesMixin LocalizeMixin
 * @appliesMixin NavigateMixin
 */
class HaAutomationPicker extends LocalizeMixin(NavigateMixin(PolymerElement)) {
  static get template() {
    return html`
    <style include="ha-style">
      :host {
        display: block;
      }

      paper-item {
        cursor: pointer;
      }

      paper-fab {
        position: fixed;
        bottom: 16px;
        right: 16px;
        z-index: 1;
      }

      paper-fab[is-wide] {
        bottom: 24px;
        right: 24px;
      }

      a {
        color: var(--primary-color);
      }

      ha-markdown p {
        margin: 0px;
      }
    </style>

    <ha-app-layout has-scrolling-region="">
      <app-header slot="header" fixed="">
        <app-toolbar>
          <paper-icon-button icon="hass:arrow-left" on-click="_backTapped"></paper-icon-button>
          <div main-title="">[[localize('ui.panel.config.automation.caption')]]</div>
        </app-toolbar>
      </app-header>

      <ha-config-section is-wide="[[isWide]]">
        <div slot="header">[[localize('ui.panel.config.automation.picker.header')]]</div>
        <div slot="introduction">
          <ha-markdown content="[[localize('ui.panel.config.automation.picker.introduction')]]"></ha-markdown>
        </div>

        <paper-card heading="[[localize('ui.panel.config.automation.picker.pick_automation')]]">
          <template is="dom-if" if="[[!automations.length]]">
            <div class="card-content">
              <p>[[localize('ui.panel.config.automation.picker.no_automations')]]</p>
            </div>
          </template>
          <template is="dom-repeat" items="[[automations]]" as="automation">
            <paper-item>
              <paper-item-body two-line="" on-click="automationTapped">
                <div>[[computeName(automation)]]</div>
                <div secondary="">[[computeDescription(automation)]]</div>
              </paper-item-body>
              <iron-icon icon="hass:chevron-right"></iron-icon>
            </paper-item>
          </template>
        </paper-card>
      </ha-config-section>

      <paper-fab slot="fab" is-wide$="[[isWide]]" icon="hass:plus" title="[[localize('ui.panel.config.automation.picker.add_automation')]]" on-click="addAutomation"></paper-fab>
    </ha-app-layout>
`;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      narrow: {
        type: Boolean,
      },

      showMenu: {
        type: Boolean,
        value: false,
      },

      automations: {
        type: Array,
      },

      isWide: {
        type: Boolean,
      },
    };
  }

  automationTapped(ev) {
    this.navigate(
      "/config/automation/edit/" +
        this.automations[ev.model.index].attributes.id
    );
  }

  addAutomation() {
    this.navigate("/config/automation/new");
  }

  computeName(automation) {
    return computeStateName(automation);
  }

  // Still thinking of something to add here.
  // eslint-disable-next-line
  computeDescription(automation) {
    return "";
  }

  _backTapped() {
    history.back();
  }
}

customElements.define("ha-automation-picker", HaAutomationPicker);
