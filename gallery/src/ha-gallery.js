import '@polymer/polymer/lib/elements/dom-if.js';
import '@polymer/polymer/lib/elements/dom-repeat.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

const demos = require.context('./demos', true, /^(.*\.(js$))[^.]*$/im);

const fixPath = path => path.substr(2, path.length - 5);

class HaGallery extends PolymerElement {
  static get template() {
    return html`
      <div id='demo'></div>
      <template is='dom-if' if='[[!_demo]]'>
        <ul>
          <template is='dom-repeat' items='[[_demos]]'>
            <li><a href='#[[item]]'>{{ item }}</a></li>
          </template>
        </ul>
      </template>
    `;
  }

  static get properties() {
    return {
      _demo: {
        type: Object,
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

  _demoChanged(demo) {
    const root = this.$.demo;

    while (root.lastChild) root.removeChild(root.lastChild);

    if (demo) {
      demos(`./${demo}.js`);
      const el = document.createElement(demo);
      root.appendChild(el);
    }
  }
}

customElements.define('ha-gallery', HaGallery);
