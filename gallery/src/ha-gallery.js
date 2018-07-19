import '@polymer/app-layout/app-header-layout/app-header-layout.js';
import '@polymer/app-layout/app-header/app-header.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

const demos = require.context('./demos', true, /^(.*\.(js$))[^.]*$/im);

const fixPath = path => path.substr(2, path.length - 5);

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

      paper-card {
        display: block;
        max-width: 400px;
        margin: 20px auto;
      }

      p:first-child {
        margin-top: 0;
      }

      a {
        color: var(--primary-color);
      }

      ul {
        padding-left: 24px;
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
            <paper-card heading="Lovelace card demos">
              <div class='card-content'>
                <p>
                  Lovelace has many different cards. Each card allows the user to tell a different story about what is going on in their house. These cards are very customizable, as no household is the same.
                </p>

                <p>
                  This gallery helps our developers and designers to see all the different states that each card can be in.
                </p>

                <p>
                  Check <a href='https://www.home-assistant.io/lovelace'>the official website</a> for instructions on how to get started with Lovelace.</a>.
                </p>


                <ul>
                  <template is='dom-repeat' items='[[_demos]]'>
                    <li><a href='#[[item]]'>{{ item }}</a></li>
                  </template>
                </ul>
              </div>
            </paper-card>
          </template>
        </div>
      </app-header-layout>
    `;
  }

  static get properties() {
    return {
      _demo: {
        type: String,
        value: document.location.hash.substr(1),
        observer: '_demoChanged',
      },
      _demos: {
        type: Array,
        value: demos.keys().map(fixPath)
      }
    };
  }

  ready() {
    super.ready();

    this.addEventListener('hass-more-info', (ev) => {
      if (ev.detail.entityId) alert(`Showing more info for ${ev.detail.entityId}`);
    });

    window.addEventListener('hashchange', () => { this._demo = document.location.hash.substr(1); });
  }

  _withDefault(value, def) {
    return value || def;
  }

  _demoChanged(demo) {
    const root = this.$.demo;

    while (root.lastChild) root.removeChild(root.lastChild);

    if (demo) {
      demos(`./${demo}.js`);
      const el = document.createElement(demo);
      root.appendChild(el);
    }
  }

  _computeHeaderButtonClass(demo) {
    return demo ? '' : 'invisible';
  }

  _backTapped() {
    document.location.hash = '';
  }
}

customElements.define('ha-gallery', HaGallery);
