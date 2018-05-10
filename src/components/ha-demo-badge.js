import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import './ha-label-badge.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
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

  static get is() { return 'ha-demo-badge'; }
}

customElements.define(HaDemoBadge.is, HaDemoBadge);
