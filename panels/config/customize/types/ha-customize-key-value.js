import '@polymer/paper-input/paper-input.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

class HaCustomizeKeyValue extends PolymerElement {
  static get template() {
    return html`
    <style>
      :host {
        @apply --layout-horizontal;
      }
      paper-input {
        @apply --layout-flex;
      }
      .key {
        padding-right: 20px;
      }
    </style>
    <paper-input disabled="[[item.secondary]]" class="key" label="Attribute name" value="{{item.attribute}}">
    </paper-input>
    <paper-input disabled="[[item.secondary]]" label="Attribute value" value="{{item.value}}">
    </paper-input>
`;
  }

  static get is() { return 'ha-customize-key-value'; }

  static get properties() {
    return {
      item: {
        type: Object,
        notifies: true,
      }
    };
  }
}
customElements.define(HaCustomizeKeyValue.is, HaCustomizeKeyValue);
