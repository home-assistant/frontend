import '@polymer/iron-icon/iron-icon.js';
import '@polymer/paper-input/paper-input.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

class HaCustomizeIcon extends PolymerElement {
  static get template() {
    return html`
    <style>
      :host {
        @apply --layout-horizontal;
      }
      .icon-image {
        border: 1px solid grey;
        padding: 8px;
        margin-right: 20px;
        margin-top: 10px;
      }
    </style>
    <iron-icon class="icon-image" icon="[[item.value]]"></iron-icon>
    <paper-input auto-validate="" pattern="(hass:.*)?" error-message="Must start with 'hass:'" disabled="[[item.secondary]]" label="icon" value="{{item.value}}">
    </paper-input>
`;
  }

  static get properties() {
    return {
      item: {
        type: Object,
        notifies: true,
      }
    };
  }
}
customElements.define('ha-customize-icon', HaCustomizeIcon);
