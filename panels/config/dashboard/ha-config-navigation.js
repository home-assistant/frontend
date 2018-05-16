import '@polymer/iron-icon/iron-icon.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-item/paper-item-body.js';
import '@polymer/paper-item/paper-item.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../../src/util/hass-mixins.js';

import isComponentLoaded from '../../../js/common/config/is_component_loaded.js';

{
  const CORE_PAGES = [
    'core',
    'customize',
  ];
  /*
   * @appliesMixin window.hassMixins.LocalizeMixin
   * @appliesMixin window.hassMixins.EventsMixin
   */
  class HaConfigNavigation extends
    window.hassMixins.LocalizeMixin(window.hassMixins.NavigateMixin(PolymerElement)) {
    static get template() {
      return html`
    <style include="iron-flex">
      paper-card {
        display: block;
      }
      paper-item {
        cursor: pointer;
      }
    </style>
    <paper-card>
      <template is="dom-repeat" items="[[pages]]">
        <template is="dom-if" if="[[_computeLoaded(hass, item)]]">
          <paper-item on-click="_navigate">
            <paper-item-body two-line="">
              [[_computeCaption(item, localize)]]
              <div secondary="">[[_computeDescription(item, localize)]]</div>
            </paper-item-body>
            <iron-icon icon="mdi:chevron-right"></iron-icon>
          </paper-item>
        </template>
      </template>
    </paper-card>
`;
    }

    static get properties() {
      return {
        hass: {
          type: Object,
        },

        pages: {
          type: Array,
          value: [
            'core',
            'customize',
            'automation',
            'script',
            'zwave',
          ],
        }
      };
    }

    _computeLoaded(hass, page) {
      return CORE_PAGES.includes(page) || isComponentLoaded(hass, page);
    }

    _computeCaption(page, localize) {
      return localize(`ui.panel.config.${page}.caption`);
    }

    _computeDescription(page, localize) {
      return localize(`ui.panel.config.${page}.description`);
    }

    _navigate(ev) {
      this.navigate('/config/' + ev.model.item);
    }
  }

  customElements.define('ha-config-navigation', HaConfigNavigation);
}
