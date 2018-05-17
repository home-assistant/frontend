import 'web-animations-js/web-animations-next-lite.min.js';

import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../src/resources/ha-style.js';
import EventsMixin from '../../../src/mixins/events-mixin.js';

class HassioAddonAudio extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="ha-style">
      :host,
      paper-card,
      paper-dropdown-menu {
        display: block;
      }
      .errors {
        color: var(--google-red-500);
        margin-bottom: 16px;
      }
      paper-item {
        width: 450px;
      }
      .card-actions {
        text-align: right;
      }
    </style>
    <paper-card heading="Audio">
      <div class="card-content">
        <template is="dom-if" if="[[error]]">
          <div class="errors">[[error]]</div>
        </template>

        <paper-dropdown-menu label="Input">
          <paper-listbox slot="dropdown-content" attr-for-selected="device" selected="{{selectedInput}}">
            <template is="dom-repeat" items="[[inputDevices]]">
              <paper-item device\$="[[item.device]]">[[item.name]]</paper-item>
            </template>
          </paper-listbox>
        </paper-dropdown-menu>
        <paper-dropdown-menu label="Output">
          <paper-listbox slot="dropdown-content" attr-for-selected="device" selected="{{selectedOutput}}">
            <template is="dom-repeat" items="[[outputDevices]]">
              <paper-item device\$="[[item.device]]">[[item.name]]</paper-item>
            </template>
          </paper-listbox>
        </paper-dropdown-menu>
      </div>
      <div class="card-actions">
        <paper-button on-click="_saveSettings">Save</paper-button>
      </div>
    </paper-card>
`;
  }

  static get properties() {
    return {
      hass: Object,
      addon: {
        type: Object,
        observer: 'addonChanged'
      },
      inputDevices: Array,
      outputDevices: Array,
      selectedInput: String,
      selectedOutput: String,
      error: String,
    };
  }

  addonChanged(addon) {
    this.setProperties({
      selectedInput: addon.audio_input || 'null',
      selectedOutput: addon.audio_output || 'null'
    });
    if (this.outputDevices) return;

    const noDevice = [{ device: 'null', name: '-' }];
    this.hass.callApi('get', 'hassio/hardware/audio').then((resp) => {
      const dev = resp.data.audio;
      const input = Object.keys(dev.input).map(key => ({ device: key, name: dev.input[key] }));
      const output = Object.keys(dev.output).map(key => ({ device: key, name: dev.output[key] }));
      this.setProperties({
        inputDevices: noDevice.concat(input),
        outputDevices: noDevice.concat(output)
      });
    }, () => {
      this.setProperties({
        inputDevices: noDevice,
        outputDevices: noDevice
      });
    });
  }

  _saveSettings() {
    this.error = null;
    const path = `hassio/addons/${this.addon.slug}/options`;
    this.hass.callApi('post', path, {
      audio_input: this.selectedInput === 'null' ? null : this.selectedInput,
      audio_output: this.selectedOutput === 'null' ? null : this.selectedOutput
    }).then(() => {
      this.fire('hass-api-called', { success: true, path: path });
    }, (resp) => {
      this.error = resp.body.message;
    });
  }
}

customElements.define('hassio-addon-audio', HassioAddonAudio);
