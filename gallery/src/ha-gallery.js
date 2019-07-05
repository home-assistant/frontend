import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/iron-icon/iron-icon";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-icon-button/paper-icon-button";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../src/managers/notification-manager";
import "../../src/components/ha-card";

const DEMOS = require.context("./demos", true, /^(.*\.(ts$))[^.]*$/im);

const fixPath = (path) => path.substr(2, path.length - 5);

class HaGallery extends PolymerElement {
  static get template() {
    return html`
      <style include="iron-positioning ha-style">
      :host {
        -ms-user-select: initial;
        -webkit-user-select: initial;
        -moz-user-select: initial;
      }
      app-header-layout {
        min-height: 100vh;
      }
      paper-icon-button.invisible {
        visibility: hidden;
      }

      .pickers {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        align-items: start;
      }

      .pickers ha-card {
        width: 400px;
        display: block;
        margin: 16px 8px;
      }

      .pickers ha-card:last-child {
        margin-bottom: 16px;
      }

      .intro {
        margin: -1em 0;
      }

      p a {
        color: var(--primary-color);
      }

      a {
        color: var(--primary-text-color);
        text-decoration: none;
      }

      </style>

      <app-header-layout>
        <app-header slot="header" fixed>
          <app-toolbar>
            <paper-icon-button
              icon="hass:arrow-left"
              on-click="_backTapped"
              class$='[[_computeHeaderButtonClass(_demo)]]'
            ></paper-icon-button>
            <div main-title>[[_withDefault(_demo, "Home Assistant Gallery")]]</div>
          </app-toolbar>
        </app-header>

        <div class='content'>
          <div id='demo'></div>
          <template is='dom-if' if='[[!_demo]]'>
            <div class='pickers'>
              <ha-card header="Lovelace card demos">
                <div class='card-content intro'>
                  <p>
                    Lovelace has many different cards. Each card allows the user to tell a different story about what is going on in their house. These cards are very customizable, as no household is the same.
                  </p>

                  <p>
                    This gallery helps our developers and designers to see all the different states that each card can be in.
                  </p>

                  <p>
                    Check <a href='https://www.home-assistant.io/lovelace'>the official website</a> for instructions on how to get started with Lovelace.</a>.
                  </p>
                </div>
                <template is='dom-repeat' items='[[_lovelaceDemos]]'>
                  <a href='#[[item]]'>
                    <paper-item>
                      <paper-item-body>{{ item }}</paper-item-body>
                      <iron-icon icon="hass:chevron-right"></iron-icon>
                    </paper-item>
                  </a>
                </template>
              </ha-card>

              <ha-card header="More Info demos">
                <div class='card-content intro'>
                  <p>
                    More info screens show up when an entity is clicked.
                  </p>
                </div>
                <template is='dom-repeat' items='[[_moreInfoDemos]]'>
                  <a href='#[[item]]'>
                    <paper-item>
                      <paper-item-body>{{ item }}</paper-item-body>
                      <iron-icon icon="hass:chevron-right"></iron-icon>
                    </paper-item>
                  </a>
                </template>
              </ha-card>

              <ha-card header="Util demos">
                <div class='card-content intro'>
                  <p>
                    Test pages for our utility functions.
                  </p>
                </div>
                <template is='dom-repeat' items='[[_utilDemos]]'>
                  <a href='#[[item]]'>
                    <paper-item>
                      <paper-item-body>{{ item }}</paper-item-body>
                      <iron-icon icon="hass:chevron-right"></iron-icon>
                    </paper-item>
                  </a>
                </template>
              </ha-card>
            </div>
          </template>
        </div>
      </app-header-layout>
      <notification-manager hass=[[_fakeHass]] id='notifications'></notification-manager>
    `;
  }

  static get properties() {
    return {
      _fakeHass: {
        type: Object,
        // Just enough for computeRTL
        value: {
          language: "en",
          translationMetadata: {
            translations: {},
          },
        },
      },
      _demo: {
        type: String,
        value: document.location.hash.substr(1),
        observer: "_demoChanged",
      },
      _demos: {
        type: Array,
        value: DEMOS.keys().map(fixPath),
      },
      _lovelaceDemos: {
        type: Array,
        computed: "_computeLovelace(_demos)",
      },
      _moreInfoDemos: {
        type: Array,
        computed: "_computeMoreInfos(_demos)",
      },
      _utilDemos: {
        type: Array,
        computed: "_computeUtil(_demos)",
      },
    };
  }

  ready() {
    super.ready();

    this.addEventListener("show-notification", (ev) =>
      this.$.notifications.showDialog({ message: ev.detail.message })
    );

    this.addEventListener("hass-more-info", (ev) => {
      if (ev.detail.entityId) {
        this.$.notifications.showDialog({
          message: `Showing more info for ${ev.detail.entityId}`,
        });
      }
    });

    window.addEventListener("hashchange", () => {
      this._demo = document.location.hash.substr(1);
    });
  }

  _withDefault(value, def) {
    return value || def;
  }

  _demoChanged(demo) {
    const root = this.$.demo;

    while (root.lastChild) root.removeChild(root.lastChild);

    if (demo) {
      DEMOS(`./${demo}.ts`);
      const el = document.createElement(demo);
      root.appendChild(el);
    }
  }

  _computeHeaderButtonClass(demo) {
    return demo ? "" : "invisible";
  }

  _backTapped() {
    document.location.hash = "";
  }

  _computeLovelace(demos) {
    return demos.filter((demo) => demo.includes("hui"));
  }

  _computeMoreInfos(demos) {
    return demos.filter((demo) => demo.includes("more-info"));
  }

  _computeUtil(demos) {
    return demos.filter((demo) => demo.includes("util"));
  }
}

customElements.define("ha-gallery", HaGallery);
