import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import { MutableData } from '@polymer/polymer/lib/mixins/mutable-data.js';
import './ha-customize-attribute.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

class HaFormCustomizeAttributes extends MutableData(PolymerElement) {
  static get template() {
    return html`
    <style>
      [hidden] {
        display: none;
      }
    </style>
    <template is="dom-repeat" items="{{attributes}}" mutable-data="">
      <ha-customize-attribute item="{{item}}" hidden\$="[[item.closed]]">
      </ha-customize-attribute>
    </template>
`;
  }

  static get is() { return 'ha-form-customize-attributes'; }

  static get properties() {
    return {
      attributes: {
        type: Array,
        notify: true,
      },
    };
  }
}
customElements.define(HaFormCustomizeAttributes.is, HaFormCustomizeAttributes);
