import "@polymer/app-layout/app-header/app-header.js";
import "@polymer/app-layout/app-toolbar/app-toolbar.js";
import "@polymer/paper-icon-button/paper-icon-button.js";
import "@polymer/paper-fab/paper-fab.js";

import { html } from "@polymer/polymer/lib/utils/html-tag.js";
import { PolymerElement } from "@polymer/polymer/polymer-element.js";
import { h, render } from "preact";

import "../../../layouts/ha-app-layout.js";

import Automation from "../js/automation.js";
import unmountPreact from "../../../common/preact/unmount.js";
import computeStateName from "../../../common/entity/compute_state_name.js";
import NavigateMixin from "../../../mixins/navigate-mixin.js";
import LocalizeMixin from "../../../mixins/localize-mixin.js";

function AutomationEditor(mountEl, props, mergeEl) {
  return render(h(Automation, props), mountEl, mergeEl);
}

/*
 * @appliesMixin LocalizeMixin
 * @appliesMixin NavigateMixin
 */
class HaAutomationEditor extends LocalizeMixin(NavigateMixin(PolymerElement)) {
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
          <paper-icon-button icon="hass:arrow-left" on-click="backTapped"></paper-icon-button>
          <div main-title="">[[computeName(automation, localize)]]</div>
        </app-toolbar>
      </app-header>

      <div class="content">
        <template is="dom-if" if="[[errors]]">
          <div class="errors">[[errors]]</div>
        </template>
        <div id="root"></div>
      </div>
      <paper-fab slot="fab" is-wide$="[[isWide]]" dirty$="[[dirty]]" icon="hass:content-save" title="[[localize('ui.panel.config.automation.editor.save')]]" on-click="saveAutomation"></paper-fab>
    </ha-app-layout>
`;
  }

  static get properties() {
    return {
      hass: {
        type: Object,
        observer: "_updateComponent",
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

      automation: {
        type: Object,
        observer: "automationChanged",
      },

      creatingNew: {
        type: Boolean,
        observer: "creatingNewChanged",
      },

      isWide: {
        type: Boolean,
        observer: "_updateComponent",
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

  automationChanged(newVal, oldVal) {
    if (!newVal) return;
    if (!this.hass) {
      setTimeout(() => this.automationChanged(newVal, oldVal), 0);
      return;
    }
    if (oldVal && oldVal.attributes.id === newVal.attributes.id) {
      return;
    }
    this.hass
      .callApi("get", "config/automation/config/" + newVal.attributes.id)
      .then(
        function(config) {
          // Normalize data: ensure trigger, action and condition are lists
          // Happens when people copy paste their automations into the config
          ["trigger", "condition", "action"].forEach(function(key) {
            var value = config[key];
            if (value && !Array.isArray(value)) {
              config[key] = [value];
            }
          });
          this.dirty = false;
          this.config = config;
          this._updateComponent();
        }.bind(this)
      );
  }

  creatingNewChanged(newVal) {
    if (!newVal) {
      return;
    }
    this.dirty = false;
    this.config = {
      alias: this.localize("ui.panel.config.automation.editor.default_name"),
      trigger: [{ platform: "state" }],
      condition: [],
      action: [{ service: "" }],
    };
    this._updateComponent();
  }

  backTapped() {
    if (
      this.dirty &&
      // eslint-disable-next-line
      !confirm(
        this.localize("ui.panel.config.automation.editor.unsaved_confirm")
      )
    ) {
      return;
    }
    history.back();
  }

  async _updateComponent() {
    if (this._renderScheduled || !this.hass || !this.config) return;
    this._renderScheduled = true;

    await 0;

    if (!this._renderScheduled) return;

    this._renderScheduled = false;

    this._rendered = AutomationEditor(
      this.$.root,
      {
        automation: this.config,
        onChange: this.configChanged,
        isWide: this.isWide,
        hass: this.hass,
        localize: this.localize,
      },
      this._rendered
    );
  }

  saveAutomation() {
    var id = this.creatingNew ? "" + Date.now() : this.automation.attributes.id;
    this.hass
      .callApi("post", "config/automation/config/" + id, this.config)
      .then(
        function() {
          this.dirty = false;

          if (this.creatingNew) {
            this.navigate(`/config/automation/edit/${id}`, true);
          }
        }.bind(this),
        function(errors) {
          this.errors = errors.body.message;
          throw errors;
        }.bind(this)
      );
  }

  computeName(automation, localize) {
    return automation
      ? computeStateName(automation)
      : localize("ui.panel.config.automation.editor.default_name");
  }
}

customElements.define("ha-automation-editor", HaAutomationEditor);
