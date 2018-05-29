import '@polymer/iron-icon/iron-icon.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import domainIcon from '../common/entity/domain_icon.js';

class DomainIcon extends PolymerElement {
  static get template() {
    return html`
    <iron-icon icon="[[computeIcon(domain, state)]]"></iron-icon>
`;
  }

  static get properties() {
    return {
      domain: {
        type: String,
        value: '',
      },

      state: {
        type: String,
        value: '',
      },
    };
  }

  computeIcon(domain, state) {
    return domainIcon(domain, state);
  }
}

customElements.define('domain-icon', DomainIcon);
