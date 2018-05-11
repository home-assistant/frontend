import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-item/paper-item.js';
import '../../../../src/util/hass-mixins.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

class HaCustomizeArray extends window.hassMixins.EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <style>
      paper-dropdown-menu {
        margin: -9px 0;
      }
    </style>
    <paper-dropdown-menu label="[[item.description]]" disabled="[[item.secondary]]" selected-item-label="{{item.value}}" dynamic-align="">
      <paper-listbox slot="dropdown-content" selected="[[computeSelected(item)]]">
        <template is="dom-repeat" items="[[getOptions(item)]]" as="option">
          <paper-item>[[option]]</paper-item>
        </template>
      </paper-listbox>
    </paper-dropdown-menu>
`;
  }

  static get is() { return 'ha-customize-array'; }

  static get properties() {
    return {
      item: {
        type: Object,
        notifies: true,
      }
    };
  }

  getOptions(item) {
    const domain = item.domain || '*';
    const options = item.options[domain] || item.options['*'];
    if (!options) {
      this.item.type = 'string';
      this.fire('item-changed');
      return [];
    }
    return options.sort();
  }

  computeSelected(item) {
    const options = this.getOptions(item);
    return options.indexOf(item.value);
  }
}
customElements.define(HaCustomizeArray.is, HaCustomizeArray);
