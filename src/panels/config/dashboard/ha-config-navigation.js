import "@polymer/iron-icon/iron-icon";
import "@polymer/paper-card/paper-card";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-item/paper-item";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import NavigateMixin from "../../../mixins/navigate-mixin";
import LocalizeMixin from "../../../mixins/localize-mixin";

import isComponentLoaded from "../../../common/config/is_component_loaded";

const CORE_PAGES = ["core", "customize"];
/*
 * @appliesMixin LocalizeMixin
 * @appliesMixin NavigateMixin
 */
class HaConfigNavigation extends LocalizeMixin(NavigateMixin(PolymerElement)) {
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
              <iron-icon icon="hass:chevron-right"></iron-icon>
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
        value: ["core", "customize", "automation", "script", "zha", "zwave"],
      },
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
    this.navigate("/config/" + ev.model.item);
  }
}

customElements.define("ha-config-navigation", HaConfigNavigation);
