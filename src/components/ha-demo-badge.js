import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "./ha-label-badge";

class HaDemoBadge extends PolymerElement {
  static get template() {
    return html`
    <style>
      :host {
        --ha-label-badge-color: #dac90d;
      }
    </style>

    <ha-label-badge icon="hass:emoticon" label="Demo" description=""></ha-label-badge>
`;
  }
}

customElements.define("ha-demo-badge", HaDemoBadge);
