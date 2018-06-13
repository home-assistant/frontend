import '@polymer/app-layout/app-header/app-header.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-fab/paper-fab.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-item/paper-item-body.js';
import '@polymer/paper-item/paper-item.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../layouts/ha-app-layout.js';

import '../ha-config-section.js';

import computeStateName from '../../../common/entity/compute_state_name.js';
import NavigateMixin from '../../../mixins/navigate-mixin.js';
import LocalizeMixin from '../../../mixins/localize-mixin.js';

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

      a {
        color: var(--primary-color);
      }
    </style>

    <ha-app-layout has-scrolling-region="">
      <app-header slot="header" fixed="">
        <app-toolbar>
          <paper-icon-button icon="hass:arrow-left" on-click="_backTapped"></paper-icon-button>
          <div main-title="">[[localize('ui.panel.config.script.caption')]]</div>
        </app-toolbar>
      </app-header>

      <ha-config-section is-wide="[[isWide]]">
        <div slot="header">Script Editor</div>
        <div slot="introduction">
          The script editor allows you to create and edit scripts.
          Please read <a href="https://home-assistant.io/docs/scripts/editor/" target="_blank">the instructions</a> to make sure that you have configured Home Assistant correctly.
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
              <iron-icon icon="hass:chevron-right"></iron-icon>
            </paper-item>
          </template>
        </paper-card>
      </ha-config-section>

      <paper-fab slot="fab" is-wide$="[[isWide]]" icon="hass:plus" title="Add Script" on-click="addScript"></paper-fab>
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
    };
  }

  scriptTapped(ev) {
    this.navigate('/config/script/edit/' + this.scripts[ev.model.index].entity_id);
  }

  addScript() {
    this.navigate('/config/script/new');
  }

  computeName(script) {
    return computeStateName(script);
  }

  // Still thinking of something to add here.
  // eslint-disable-next-line
  computeDescription(script) {
    return '';
  }

  _backTapped() {
    history.back();
  }
}

customElements.define('ha-script-picker', HaScriptPicker);
