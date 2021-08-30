import "@polymer/app-layout/app-header-layout/app-header-layout";
import "@polymer/app-layout/app-header/app-header";
import "@polymer/app-layout/app-toolbar/app-toolbar";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import "../../src/components/ha-card";
import "../../src/components/ha-icon";
import "../../src/components/ha-icon-button";
import "../../src/managers/notification-manager";
import "../../src/styles/polymer-ha-style";
// eslint-disable-next-line import/extensions
import { DEMOS } from "../build/import-demos";

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
        ha-icon-button.invisible {
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
            <ha-icon-button
              icon="hass:arrow-left"
              on-click="_backTapped"
              class$="[[_computeHeaderButtonClass(_demo)]]"
            ></ha-icon-button>
            <div main-title>
              [[_withDefault(_demo, "Home Assistant Gallery")]]
            </div>
          </app-toolbar>
        </app-header>

        <div class="content">
          <div id="demo"></div>
          <template is="dom-if" if="[[!_demo]]">
            <div class="pickers">
              <ha-card header="Lovelace Card Demos">
                <div class="card-content intro">
                  <p>
                    Lovelace has many different cards. Each card allows the user
                    to tell a different story about what is going on in their
                    house. These cards are very customizable, as no household is
                    the same.
                  </p>

                  <p>
                    This gallery helps our developers and designers to see all
                    the different states that each card can be in.
                  </p>

                  <p>
                    Check
                    <a href="https://www.home-assistant.io/lovelace"
                      >the official website</a
                    >
                    for instructions on how to get started with Lovelace.
                  </p>
                </div>
                <template is="dom-repeat" items="[[_lovelaceDemos]]">
                  <a href="#[[item]]">
                    <paper-item>
                      <paper-item-body>{{ item }}</paper-item-body>
                      <ha-icon icon="hass:chevron-right"></ha-icon>
                    </paper-item>
                  </a>
                </template>
              </ha-card>

              <ha-card header="Other Demos">
                <div class="card-content intro"></div>
                <template is="dom-repeat" items="[[_restDemos]]">
                  <a href="#[[item]]">
                    <paper-item>
                      <paper-item-body>{{ item }}</paper-item-body>
                      <ha-icon icon="hass:chevron-right"></ha-icon>
                    </paper-item>
                  </a>
                </template>
              </ha-card>
            </div>
          </template>
        </div>
      </app-header-layout>
      <notification-manager
        hass="[[_fakeHass]]"
        id="notifications"
      ></notification-manager>
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
        value: Object.keys(DEMOS),
      },
      _lovelaceDemos: {
        type: Array,
        computed: "_computeLovelace(_demos)",
      },
      _restDemos: {
        type: Array,
        computed: "_computeRest(_demos)",
      },
    };
  }

  ready() {
    super.ready();

    this.addEventListener("show-notification", (ev) =>
      this.$.notifications.showDialog({ message: ev.detail.message })
    );

    this.addEventListener("alert-dismissed-clicked", () =>
      this.$.notifications.showDialog({ message: "Alert dismissed clicked" })
    );

    this.addEventListener("alert-action-clicked", () =>
      this.$.notifications.showDialog({ message: "Alert action clicked" })
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
      DEMOS[demo]();
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

  _computeRest(demos) {
    return demos.filter((demo) => !demo.includes("hui"));
  }
}

customElements.define("ha-gallery", HaGallery);
