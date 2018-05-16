import '@polymer/app-layout/app-header/app-header.js';
import '@polymer/app-layout/app-toolbar/app-toolbar.js';
import '@polymer/iron-autogrow-textarea/iron-autogrow-textarea.js';
import '@polymer/paper-card/paper-card.js';
import '@polymer/paper-dropdown-menu/paper-dropdown-menu-light.js';
import '@polymer/paper-fab/paper-fab.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-input/paper-textarea.js';
import '@polymer/paper-item/paper-item-body.js';
import '@polymer/paper-item/paper-item.js';
import '@polymer/paper-listbox/paper-listbox.js';
import '@polymer/paper-menu-button/paper-menu-button.js';
import '@polymer/paper-radio-button/paper-radio-button.js';
import '@polymer/paper-radio-group/paper-radio-group.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import { h, render } from 'preact';

import '../../../src/components/entity/ha-entity-picker.js';
import '../../../src/components/ha-combo-box.js';
import '../../../src/layouts/ha-app-layout.js';
import '../../../src/util/hass-mixins.js';
import '../ha-config-section.js';
import Script from '../../../js/panel-config/script.js';
import unmountPreact from '../../../js/common/preact/unmount.js';

function ScriptEditor(mountEl, props, mergeEl) {
  return render(h(Script, props), mountEl, mergeEl);
}

/*
 * @appliesMixin window.hassMixins.LocalizeMixin
 */
class HaScriptEditor extends
  window.hassMixins.LocalizeMixin(window.hassMixins.NavigateMixin(PolymerElement)) {
  static get template() {
    return html`
    <style include="ha-style">
      .errors {
        padding: 20px;
        font-weight: bold;
        color: var(--google-red-500);
      }
      .content {
        padding-bottom: 20px;
      }
      paper-card {
        display: block;
      }
      .triggers,
      .script {
        margin-top: -16px;
      }
      .triggers paper-card,
      .script paper-card {
        margin-top: 16px;
      }
      .add-card paper-button {
        display: block;
        text-align: center;
      }
      .card-menu {
        position: absolute;
        top: 0;
        right: 0;
        z-index: 1;
        color: var(--primary-text-color);
      }
      .card-menu paper-item {
        cursor: pointer;
      }
      span[slot=introduction] a {
        color: var(--primary-color);
      }
      paper-fab {
        position: fixed;
        bottom: 16px;
        right: 16px;
        z-index: 1;
        margin-bottom: -80px;
        transition: margin-bottom .3s;
      }

      paper-fab[is-wide] {
        bottom: 24px;
        right: 24px;
      }

      paper-fab[dirty] {
        margin-bottom: 0;
      }
    </style>
    <ha-app-layout has-scrolling-region="">
      <app-header slot="header" fixed="">
        <app-toolbar>
          <paper-icon-button icon="mdi:arrow-left" on-click="backTapped"></paper-icon-button>
          <div main-title="">Script [[name]]</div>
        </app-toolbar>
      </app-header>
      <div class="content">
        <template is="dom-if" if="[[errors]]">
          <div class="errors">[[errors]]</div>
        </template>
        <div id="root"></div>
      </div>
      <paper-fab slot="fab" is-wide\$="[[isWide]]" dirty\$="[[dirty]]" icon="mdi:content-save" title="Save" on-click="saveScript"></paper-fab>
    </ha-app-layout>
`;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      narrow: {
        type: Boolean,
      },

      showMenu: {
        type: Boolean,
        value: false,
      },

      errors: {
        type: Object,
        value: null,
      },

      dirty: {
        type: Boolean,
        value: false,
      },

      config: {
        type: Object,
        value: null,
      },

      script: {
        type: Object,
        observer: 'scriptChanged',
      },

      creatingNew: {
        type: Boolean,
        observer: 'creatingNewChanged',
      },

      name: {
        type: String,
        computed: 'computeName(script)'
      },

      isWide: {
        type: Boolean,
        observer: '_updateComponent',
      },

      _rendered: {
        type: Object,
        value: null,
      },

      _renderScheduled: {
        type: Boolean,
        value: false,
      },
    };
  }

  ready() {
    this.configChanged = this.configChanged.bind(this);
    super.ready(); // This call will initialize preact.
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._rendered) {
      unmountPreact(this._rendered);
      this._rendered = null;
    }
  }

  configChanged(config) {
    // onChange gets called a lot during initial rendering causing recursing calls.
    if (this._rendered === null) return;
    this.config = config;
    this.errors = null;
    this.dirty = true;
    this._updateComponent();
  }

  scriptChanged(newVal, oldVal) {
    if (!newVal) return;
    if (!this.hass) {
      setTimeout(() => this.scriptChanged(newVal, oldVal), 0);
      return;
    }
    if (oldVal && oldVal.entity_id === newVal.entity_id) {
      return;
    }
    this.hass.callApi('get', 'config/script/config/' + window.hassUtil.computeObjectId(newVal.entity_id))
      .then((config) => {
        // Normalize data: ensure sequence is a list
        // Happens when people copy paste their scripts into the config
        var value = config.sequence;
        if (value && !Array.isArray(value)) {
          config.sequence = [value];
        }

        this.dirty = false;
        this.config = config;
        this._updateComponent();
      }, () => {
        alert('Only scripts inside scripts.yaml are editable.');
        history.back();
      });
  }

  creatingNewChanged(newVal) {
    if (!newVal) {
      return;
    }
    this.dirty = false;
    this.config = {
      alias: 'New Script',
      sequence: [
        { service: '', data: {} },
      ],
    };
    this._updateComponent();
  }

  backTapped() {
    if (this.dirty &&
        // eslint-disable-next-line
        !confirm('You have unsaved changes. Are you sure you want to leave?')) {
      return;
    }
    history.back();
  }

  _updateComponent() {
    if (this._renderScheduled || !this.hass || !this.config) return;
    this._renderScheduled = true;
    Promise.resolve().then(() => {
      this._rendered = ScriptEditor(this.$.root, {
        script: this.config,
        onChange: this.configChanged,
        isWide: this.isWide,
        hass: this.hass,
        localize: this.localize,
      }, this._rendered);
      this._renderScheduled = false;
    });
  }

  saveScript() {
    var id = this.creatingNew ?
      '' + Date.now() : window.hassUtil.computeObjectId(this.script.entity_id);
    this.hass.callApi('post', 'config/script/config/' + id, this.config).then(() => {
      this.dirty = false;

      if (this.creatingNew) {
        this.navigate(`/config/script/edit/${id}`, true);
      }
    }, (errors) => {
      this.errors = errors.body.message;
      throw errors;
    });
  }

  computeName(script) {
    return script && window.hassUtil.computeStateName(script);
  }
}

customElements.define('ha-script-editor', HaScriptEditor);
