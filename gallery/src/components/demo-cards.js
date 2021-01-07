import "@polymer/app-layout/app-toolbar/app-toolbar";
import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { applyThemesOnElement } from "../../../src/common/dom/apply_themes_on_element";
import "../../../src/components/ha-formfield";
import "../../../src/components/ha-switch";
import "./demo-card";

class DemoCards extends PolymerElement {
  static get template() {
    return html`
      <style>
        #container {
          min-height: calc(100vh - 128px);
          background: var(--primary-background-color);
        }
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
        ha-formfield {
          margin-right: 16px;
        }
      </style>
      <app-toolbar>
        <div class="filters">
          <ha-formfield label="Show config">
            <ha-switch checked="[[_showConfig]]" on-change="_showConfigToggled">
            </ha-switch>
          </ha-formfield>
          <ha-formfield label="Dark theme">
            <ha-switch on-change="_darkThemeToggled"> </ha-switch>
          </ha-formfield>
        </div>
      </app-toolbar>
      <div id="container">
        <div class="cards">
          <template is="dom-repeat" items="[[configs]]">
            <demo-card
              config="[[item]]"
              show-config="[[_showConfig]]"
              hass="[[hass]]"
            ></demo-card>
          </template>
        </div>
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

  _showConfigToggled(ev) {
    this._showConfig = ev.target.checked;
  }

  _darkThemeToggled(ev) {
    applyThemesOnElement(this.$.container, { themes: {} }, "default", {
      dark: ev.target.checked,
    });
  }
}

customElements.define("demo-cards", DemoCards);
