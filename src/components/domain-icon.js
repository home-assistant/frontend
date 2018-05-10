import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-icon/iron-icon.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
class DomainIcon extends PolymerElement {
  static get template() {
    return html`
    <iron-icon icon="[[computeIcon(domain, state)]]"></iron-icon>
`;
  }

  static get is() { return 'domain-icon'; }

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
    return window.hassUtil.domainIcon(domain, state);
  }
}

customElements.define(DomainIcon.is, DomainIcon);
