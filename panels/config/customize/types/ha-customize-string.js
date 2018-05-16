import '@polymer/paper-input/paper-input.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

class HaCustomizeString extends PolymerElement {
  static get template() {
    return html`
    <paper-input disabled="[[item.secondary]]" label="[[getLabel(item)]]" value="{{item.value}}">
    </paper-input>
`;
  }

  static get is() { return 'ha-customize-string'; }

  static get properties() {
    return {
      item: {
        type: Object,
        notifies: true,
      }
    };
  }

  getLabel(item) {
    return item.description + (item.type === 'json' ? ' (JSON formatted)' : '');
  }
}
customElements.define(HaCustomizeString.is, HaCustomizeString);
