import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/paper-toggle-button/paper-toggle-button.js';

import './demo-card.js';

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
          display: block;
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
        <div class='filters'>
          <paper-toggle-button
            checked='{{showConfig}}'
          >Show config</paper-toggle-button>
        </div>
      </app-toolbar>
      <div class='cards'>
        <template is='dom-repeat' items='[[configs]]'>
          <demo-card
            config='[[item]]'
            type='[[type]]'
            show-config='[[showConfig]]'
          ></demo-card>
        </template>
      </div>
    `;
  }

  static get properties() {
    return {
      configs: {
        type: Object,
      },
      showConfig: {
        type: Boolean,
        value: false,
      }
    };
  }
}

customElements.define('demo-cards', DemoCards);
