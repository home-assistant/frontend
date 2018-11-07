import "@polymer/iron-flex-layout/iron-flex-layout-classes";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "./hassio-host-info";
import "./hassio-supervisor-info";
import "./hassio-supervisor-log";

class HassioSystem extends PolymerElement {
  static get template() {
    return html`
      <style include="iron-flex ha-style">
        .content {
          margin: 4px;
        }
        .title {
          margin-top: 24px;
          color: var(--primary-text-color);
          font-size: 2em;
          padding-left: 8px;
          margin-bottom: 8px;
        }
      </style>
      <div class="content">
        <div class="title">Information</div>
        <hassio-supervisor-info
          hass="[[hass]]"
          data="[[supervisorInfo]]"
        ></hassio-supervisor-info>
        <hassio-host-info
          hass="[[hass]]"
          data="[[hostInfo]]"
        ></hassio-host-info>
        <div class="title">System log</div>
        <hassio-supervisor-log hass="[[hass]]"></hassio-supervisor-log>
      </div>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      supervisorInfo: Object,
      hostInfo: Object,
    };
  }
}

customElements.define("hassio-system", HassioSystem);
