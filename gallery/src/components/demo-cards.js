import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import "@polymer/app-layout/app-toolbar/app-toolbar";

import "./demo-card";
import "../../../src/components/ha-switch";

class DemoCards extends PolymerElement {
  static get template() {
    return html`
      <style>
        .cards {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
        }
        demo-card {
          margin: 16px 16px 32px;
        }
        app-toolbar {
          background-color: var(--light-primary-color);
        }
        .filters {
          margin-left: 60px;
        }
      </style>
      <app-toolbar>
        <div class="filters">
          <ha-switch checked="{{_showConfig}}">Show config</ha-switch>
        </div>
      </app-toolbar>
      <div class="cards">
        <template is="dom-repeat" items="[[configs]]">
          <demo-card
            config="[[item]]"
            show-config="[[_showConfig]]"
            hass="[[hass]]"
          ></demo-card>
        </template>
      </div>
    `;
  }

  static get properties() {
    return {
      configs: Object,
      hass: Object,
      _showConfig: {
        type: Boolean,
        value: false,
      },
    };
  }
}

customElements.define("demo-cards", DemoCards);
