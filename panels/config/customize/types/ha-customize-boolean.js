import '@polymer/paper-checkbox/paper-checkbox.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

class HaCustomizeBoolean extends PolymerElement {
  static get template() {
    return html`
    <paper-checkbox disabled="[[item.secondary]]" checked="{{item.value}}">
      [[item.description]]
    </paper-checkbox>
`;
  }

  static get is() { return 'ha-customize-boolean'; }

  static get properties() {
    return {
      item: {
        type: Object,
        notifies: true,
      }
    };
  }
}
customElements.define(HaCustomizeBoolean.is, HaCustomizeBoolean);
