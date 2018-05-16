import '@polymer/paper-dialog-behavior/paper-dialog-shared-styles.js';
import '@polymer/paper-dialog-scrollable/paper-dialog-scrollable.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../resources/ha-style.js';
import '../util/hass-mixins.js';
import './more-info/more-info-controls.js';
import './more-info/more-info-settings.js';

import computeDomain from '../../js/common/entity/compute_domain';
import isComponentLoaded from '../../js/common/config/is_component_loaded.js';

class HaMoreInfoDialog extends window.hassMixins.DialogMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="ha-style-dialog paper-dialog-shared-styles">
      :host {
        font-size: 14px;
        width: 365px;
        border-radius: 2px;
      }

      more-info-controls, more-info-settings {
        --more-info-header-background: var(--secondary-background-color);
        --more-info-header-color: var(--primary-text-color);
        --ha-more-info-app-toolbar-title: {
          /* Design guideline states 24px, changed to 16 to align with state info */
          margin-left: 16px;
          line-height: 1.3em;
          max-height: 2.6em;
          overflow: hidden;
          /* webkit and blink still support simple multiline text-overflow */
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          text-overflow: ellipsis;
        }
      }

      /* overrule the ha-style-dialog max-height on small screens */
      @media all and (max-width: 450px), all and (max-height: 500px) {
        more-info-controls, more-info-settings {
          --more-info-header-background: var(--primary-color);
          --more-info-header-color: var(--text-primary-color);
        }
        :host {
          @apply(--ha-dialog-fullscreen);
        }
        :host::before {
          content: "";
          position: fixed;
          z-index: -1;
          top: 0px;
          left: 0px;
          right: 0px;
          bottom: 0px;
          background-color: inherit;
        }
      }

      :host([data-domain=camera]) {
        width: auto;
      }

      :host([data-domain=history_graph]), :host([large]) {
        width: 90%;
      }
    </style>

    <template is="dom-if" if="[[!_page]]">
      <more-info-controls class="no-padding" hass="[[hass]]" state-obj="[[stateObj]]" dialog-element="[[_dialogElement]]" can-configure="[[_registryInfo]]" large="{{large}}"></more-info-controls>
    </template>
    <template is="dom-if" if="[[_equals(_page, &quot;settings&quot;)]]">
      <more-info-settings class="no-padding" hass="[[hass]]" state-obj="[[stateObj]]" registry-info="{{_registryInfo}}"></more-info-settings>
    </template>
`;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: {
        type: Object,
        computed: '_computeStateObj(hass)',
        observer: '_stateObjChanged',
      },

      large: {
        type: Boolean,
        reflectToAttribute: true,
        observer: '_largeChanged',
      },

      _dialogElement: Object,
      _registryInfo: Object,

      _page: {
        type: String,
        value: null,
      },

      dataDomain: {
        computed: '_computeDomain(stateObj)',
        reflectToAttribute: true
      },
    };
  }

  static get observers() { return ['_dialogOpenChanged(opened)']; }

  ready() {
    super.ready();
    this._dialogElement = this;
    this.addEventListener('more-info-page', (ev) => { this._page = ev.detail.page; });
  }

  _computeDomain(stateObj) {
    return stateObj ? computeDomain(stateObj) : '';
  }

  _computeStateObj(hass) {
    return hass.states[hass.moreInfoEntityId] || null;
  }

  _stateObjChanged(newVal, oldVal) {
    if (!newVal) {
      this.setProperties({
        opened: false,
        _page: null,
        _registryInfo: null,
        large: false,
      });
      return;
    }

    if (isComponentLoaded(this.hass, 'config.entity_registry') &&
        (!oldVal || oldVal.entity_id !== newVal.entity_id)) {
      this.hass.callApi('get', `config/entity_registry/${newVal.entity_id}`)
        .then(
          (info) => { this._registryInfo = info; },
          () => { this._registryInfo = false; }
        );
    }

    requestAnimationFrame(() => requestAnimationFrame(() => {
      // allow dialog to render content before showing it so it will be
      // positioned correctly.
      this.opened = true;
    }));
  }

  _dialogOpenChanged(newVal) {
    if (!newVal && this.stateObj) {
      this.fire('hass-more-info', { entityId: null });
    }
  }

  _equals(a, b) {
    return a === b;
  }

  _largeChanged() {
    this.notifyResize();
  }
}
customElements.define('ha-more-info-dialog', HaMoreInfoDialog);
