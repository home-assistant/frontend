import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-icon-button/paper-icon-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../layouts/ha-app-layout";
import "../../../resources/ha-style";

import "./zha-network";

class HaConfigZha extends PolymerElement {
  static get template() {
    return html`
      <style include="iron-flex ha-style"></style>
      <ha-app-layout has-scrolling-region="">
        <app-header slot="header" fixed="">
          <app-toolbar>
            <paper-icon-button
              icon="hass:arrow-left"
              on-click="_backTapped"
            ></paper-icon-button>
          </app-toolbar>
        </app-header>

        <zha-network
          id="zha-network"
          is-wide="[[isWide]]"
          hass="[[hass]]"
        ></zha-network>
      </ha-app-layout>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      isWide: Boolean,
    };
  }

  _backTapped() {
    history.back();
  }
}

customElements.define("ha-config-zha", HaConfigZha);
