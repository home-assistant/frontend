import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '@polymer/paper-button/paper-button.js';
import '../../../components/ha-relative-time.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
class MoreInfoAutomation extends PolymerElement {
  static get template() {
    return html`
    <style>
      paper-button {
        color: var(--primary-color);
        font-weight: 500;
        top: 3px;
        height: 37px;
      }
    </style>

    <p>
      Last triggered:
      <ha-relative-time datetime="[[stateObj.attributes.last_triggered]]"></ha-relative-time>
    </p>

    <paper-button on-click="handleTriggerTapped">TRIGGER</paper-button>
`;
  }

  static get is() { return 'more-info-automation'; }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      stateObj: {
        type: Object,
      },
    };
  }

  handleTriggerTapped() {
    this.hass.callService('automation', 'trigger', {
      entity_id: this.stateObj.entity_id,
    });
  }
}

customElements.define(MoreInfoAutomation.is, MoreInfoAutomation);
