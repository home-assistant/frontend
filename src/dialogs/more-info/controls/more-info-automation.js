import '@polymer/paper-button/paper-button.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../components/ha-relative-time.js';

import LocalizeMixin from '../../../mixins/localize-mixin.js';

class MoreInfoAutomation extends LocalizeMixin(PolymerElement) {
  static get template() {
    return html`
      <style>
        paper-button {
          color: var(--primary-color);
          font-weight: 500;
          margin: 16px 0 0 0;
          float: right;
        }
        .flex {
          display: flex;
          justify-content: space-between;
        }
      </style>

      <div class="flex">
        <div>
          [[localize('ui.card.automation.last_triggered')]]:
        </div>
        <ha-relative-time datetime="[[stateObj.attributes.last_triggered]]"></ha-relative-time>
      </div>

      <paper-button on-click="handleTriggerTapped">
        [[localize('ui.card.automation.trigger')]]
      </paper-button>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: Object
    };
  }

  handleTriggerTapped() {
    this.hass.callService('automation', 'trigger', {
      entity_id: this.stateObj.entity_id,
    });
  }
}

customElements.define('more-info-automation', MoreInfoAutomation);
