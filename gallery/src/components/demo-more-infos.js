import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";
import "@polymer/app-layout/app-toolbar/app-toolbar";

import "./demo-more-info";
import "../../../src/components/ha-switch";

class DemoMoreInfos extends PolymerElement {
  static get template() {
    return html`
      <style>
        .cards {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
        }
        demo-more-info {
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
          <ha-switch checked="{{_showConfig}}">Show entity</ha-switch>
        </div>
      </app-toolbar>
      <div class="cards">
        <template is="dom-repeat" items="[[entities]]">
          <demo-more-info
            entity-id="[[item]]"
            show-config="[[_showConfig]]"
            hass="[[hass]]"
          ></demo-more-info>
        </template>
      </div>
    `;
  }

  static get properties() {
    return {
      entities: Array,
      hass: Object,
      _showConfig: {
        type: Boolean,
        value: false,
      },
    };
  }
}

customElements.define("demo-more-infos", DemoMoreInfos);
