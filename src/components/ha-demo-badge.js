import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import './ha-label-badge.js';

class HaDemoBadge extends PolymerElement {
  static get template() {
    return html`
    <style>
      :host {
        --ha-label-badge-color: #dac90d;
      }
    </style>

    <ha-label-badge icon="mdi:emoticon" label="Demo" description=""></ha-label-badge>
`;
  }
}

customElements.define('ha-demo-badge', HaDemoBadge);
