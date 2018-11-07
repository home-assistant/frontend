import "@polymer/iron-icon/iron-icon";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../src/components/ha-relative-time";

class HassioCardContent extends PolymerElement {
  static get template() {
    return html`
      <style>
        iron-icon {
          margin-right: 16px;
          margin-top: 16px;
          float: left;
          color: var(--secondary-text-color);
        }
        iron-icon.update {
          color: var(--paper-orange-400);
        }
        iron-icon.running,
        iron-icon.installed {
          color: var(--paper-green-400);
        }
        iron-icon.hassupdate,
        iron-icon.snapshot {
          color: var(--paper-item-icon-color);
        }
        .title {
          color: var(--primary-text-color);
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }
        .addition {
          color: var(--secondary-text-color);
          overflow: hidden;
          position: relative;
          height: 2.4em;
          line-height: 1.2em;
        }
        ha-relative-time {
          display: block;
        }
      </style>
      <iron-icon
        icon="[[icon]]"
        class\$="[[iconClass]]"
        title="[[iconTitle]]"
      ></iron-icon>
      <div>
        <div class="title">[[title]]</div>
        <div class="addition">
          <template is="dom-if" if="[[description]]">
            [[description]]
          </template>
          <template is="dom-if" if="[[datetime]]">
            <ha-relative-time
              hass="[[hass]]"
              class="addition"
              datetime="[[datetime]]"
            ></ha-relative-time>
          </template>
        </div>
      </div>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      title: String,
      description: String,
      datetime: String,
      icon: {
        type: String,
        value: "hass:help-circle",
      },
      iconTitle: String,
      iconClass: String,
    };
  }
}
customElements.define("hassio-card-content", HassioCardContent);
