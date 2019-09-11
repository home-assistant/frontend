import "@polymer/paper-icon-button/paper-icon-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import hassAttributeUtil from "../../../util/hass-attributes-util";
import "../ha-form-style";
import "./types/ha-customize-array";
import "./types/ha-customize-boolean";
import "./types/ha-customize-icon";
import "./types/ha-customize-key-value";
import "./types/ha-customize-string";

class HaCustomizeAttribute extends PolymerElement {
  static get template() {
    return html`
      <style include="ha-form-style">
        :host {
          display: block;
          position: relative;
          padding-right: 40px;
        }

        .button {
          position: absolute;
          margin-top: -20px;
          top: 50%;
          right: 0;
        }
      </style>
      <div id="wrapper" class="form-group"></div>
      <paper-icon-button
        class="button"
        icon="[[getIcon(item.secondary)]]"
        on-click="tapButton"
      ></paper-icon-button>
    `;
  }

  static get properties() {
    return {
      item: {
        type: Object,
        notify: true,
        observer: "itemObserver",
      },
    };
  }

  tapButton() {
    if (this.item.secondary) {
      this.item = { ...this.item, secondary: false };
    } else {
      this.item = { ...this.item, closed: true };
    }
  }

  getIcon(secondary) {
    return secondary ? "hass:pencil" : "hass:close";
  }

  itemObserver(item) {
    const wrapper = this.$.wrapper;
    const tag = hassAttributeUtil.TYPE_TO_TAG[item.type].toUpperCase();
    let child;
    if (wrapper.lastChild && wrapper.lastChild.tagName === tag) {
      child = wrapper.lastChild;
    } else {
      if (wrapper.lastChild) {
        wrapper.removeChild(wrapper.lastChild);
      }
      // Creating an element with upper case works fine in Chrome, but in FF it doesn't immediately
      // become a defined Custom Element. Polymer does that in some later pass.
      this.$.child = child = document.createElement(tag.toLowerCase());
      child.className = "form-control";
      child.addEventListener("item-changed", () => {
        this.item = { ...child.item };
      });
    }
    child.setProperties({ item: this.item });
    if (child.parentNode === null) {
      wrapper.appendChild(child);
    }
  }
}
customElements.define("ha-customize-attribute", HaCustomizeAttribute);
