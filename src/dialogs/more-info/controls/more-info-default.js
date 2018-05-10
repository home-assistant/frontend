import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '../../../components/ha-attributes.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
class MoreInfoDefault extends PolymerElement {
  static get template() {
    return html`
    <ha-attributes state-obj="[[stateObj]]"></ha-attributes>
`;
  }

  static get is() { return 'more-info-default'; }

  static get properties() {
    return {
      stateObj: {
        type: Object,
      },
    };
  }
}

customElements.define(MoreInfoDefault.is, MoreInfoDefault);
