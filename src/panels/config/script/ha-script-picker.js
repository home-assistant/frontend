import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-card/paper-card";
import "@polymer/paper-fab/paper-fab";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-item/paper-item";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import { computeRTL } from "../../../common/util/compute_rtl";

import "../../../layouts/ha-app-layout";
import "../../../components/ha-icon-next";
import "../../../components/ha-paper-icon-button-arrow-prev";

import "../ha-config-section";

import computeStateName from "../../../common/entity/compute_state_name";
import NavigateMixin from "../../../mixins/navigate-mixin";
import LocalizeMixin from "../../../mixins/localize-mixin";

/*
 * @appliesMixin LocalizeMixin
 * @appliesMixin NavigateMixin
 */
class HaScriptPicker extends LocalizeMixin(NavigateMixin(PolymerElement)) {
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

        paper-fab[rtl] {
          right: auto;
          left: 16px;
        }

        paper-fab[rtl][is-wide] {
          bottom: 24px;
          right: auto;
          left: 24px;
        }

        a {
          color: var(--primary-color);
        }
      </style>

      <ha-app-layout has-scrolling-region="">
        <app-header slot="header" fixed="">
          <app-toolbar>
            <ha-paper-icon-button-arrow-prev
              on-click="_backTapped"
            ></ha-paper-icon-button-arrow-prev>
            <div main-title="">
              [[localize('ui.panel.config.script.caption')]]
            </div>
          </app-toolbar>
        </app-header>

        <ha-config-section is-wide="[[isWide]]">
          <div slot="header">Script Editor</div>
          <div slot="introduction">
            The script editor allows you to create and edit scripts. Please read
            <a
              href="https://home-assistant.io/docs/scripts/editor/"
              target="_blank"
              >the instructions</a
            >
            to make sure that you have configured Home Assistant correctly.
          </div>

          <paper-card heading="Pick script to edit">
            <template is="dom-if" if="[[!scripts.length]]">
              <div class="card-content">
                <p>We couldn't find any editable scripts.</p>
              </div>
            </template>
            <template is="dom-repeat" items="[[scripts]]" as="script">
              <paper-item>
                <paper-item-body two-line="" on-click="scriptTapped">
                  <div>[[computeName(script)]]</div>
                  <div secondary="">[[computeDescription(script)]]</div>
                </paper-item-body>
                <ha-icon-next></ha-icon-next>
              </paper-item>
            </template>
          </paper-card>
        </ha-config-section>

        <paper-fab
          slot="fab"
          is-wide$="[[isWide]]"
          icon="hass:plus"
          title="Add Script"
          on-click="addScript"
          rtl$="[[rtl]]"
        ></paper-fab>
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

      scripts: {
        type: Array,
      },

      isWide: {
        type: Boolean,
      },

      rtl: {
        type: Boolean,
        reflectToAttribute: true,
        computed: "_computeRTL(hass)",
      },
    };
  }

  scriptTapped(ev) {
    this.navigate(
      "/config/script/edit/" + this.scripts[ev.model.index].entity_id
    );
  }

  addScript() {
    this.navigate("/config/script/new");
  }

  computeName(script) {
    return computeStateName(script);
  }

  // Still thinking of something to add here.
  // eslint-disable-next-line
  computeDescription(script) {
    return "";
  }

  _backTapped() {
    history.back();
  }

  _computeRTL(hass) {
    return computeRTL(hass);
  }
}

customElements.define("ha-script-picker", HaScriptPicker);
