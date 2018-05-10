import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-button/paper-button.js';
import '../../util/hass-mixins.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
class MoreInfoSettings extends window.hassMixins.EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <style>
      app-toolbar {
        color: var(--more-info-header-color);
        background-color: var(--more-info-header-background);

        /* to fit save button */
        padding-right: 0;
      }

      app-toolbar [main-title] {
        @apply --ha-more-info-app-toolbar-title;
      }

      app-toolbar paper-button {
        font-size: .8em;
        margin: 0;
      }

      .form {
        padding: 0 24px 24px;
      }
    </style>

    <app-toolbar>
      <paper-icon-button icon="mdi:arrow-left" on-click="_backTapped"></paper-icon-button>
      <div main-title="">[[_computeStateName(stateObj)]]</div>
      <paper-button on-click="_save">Save</paper-button>
    </app-toolbar>

    <div class="form">
      <paper-input value="{{_name}}" label="Name"></paper-input>
    </div>
`;
  }

  static get is() { return 'more-info-settings'; }
  static get properties() {
    return {
      hass: Object,
      stateObj: Object,

      _componentLoaded: {
        type: Boolean,
        computed: '_computeComponentLoaded(hass)'
      },

      registryInfo: {
        type: Object,
        observer: '_registryInfoChanged',
        notify: true,
      },

      _name: String,
    };
  }

  _computeStateName(stateObj) {
    if (!stateObj) return '';
    return window.hassUtil.computeStateName(stateObj);
  }

  _computeComponentLoaded(hass) {
    return window.hassUtil.isComponentLoaded(hass, 'config.entity_registry');
  }

  _registryInfoChanged(newVal) {
    if (newVal) {
      this._name = newVal.name;
    } else {
      this._name = '';
    }
  }

  _backTapped() {
    this.fire('more-info-page', { page: null });
  }

  _save() {
    const data = {
      name: this._name,
    };

    this.hass.callApi('post', `config/entity_registry/${this.stateObj.entity_id}`, data)
      .then(
        (info) => { this.registryInfo = info; },
        () => { alert('save failed!'); }
      );
  }
}
customElements.define(MoreInfoSettings.is, MoreInfoSettings);
