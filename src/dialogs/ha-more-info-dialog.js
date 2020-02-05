import "@polymer/paper-dialog-behavior/paper-dialog-shared-styles";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../resources/ha-style";

import "./more-info/more-info-controls";

import { computeStateDomain } from "../common/entity/compute_state_domain";
import { isComponentLoaded } from "../common/config/is_component_loaded";

import DialogMixin from "../mixins/dialog-mixin";

/*
 * @appliesMixin DialogMixin
 */
class HaMoreInfoDialog extends DialogMixin(PolymerElement) {
  static get template() {
    return html`
      <style include="ha-style-dialog paper-dialog-shared-styles">
        :host {
          font-size: 14px;
          width: 365px;
          border-radius: 2px;
        }

        more-info-controls {
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
          more-info-controls {
            --more-info-header-background: var(--primary-color);
            --more-info-header-color: var(--text-primary-color);
          }
          :host {
            width: 100% !important;
            border-radius: 0px;
            position: fixed !important;
            margin: 0;
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

        :host([data-domain="camera"]) {
          width: auto;
        }

        :host([data-domain="history_graph"]),
        :host([large]) {
          width: 90%;
        }
      </style>

      <more-info-controls
        class="no-padding"
        hass="[[hass]]"
        state-obj="[[stateObj]]"
        dialog-element="[[_dialogElement()]]"
        registry-entry="[[_registryInfo]]"
        large="{{large}}"
      ></more-info-controls>
    `;
  }

  static get properties() {
    return {
      hass: Object,
      stateObj: {
        type: Object,
        computed: "_computeStateObj(hass)",
        observer: "_stateObjChanged",
      },

      large: {
        type: Boolean,
        reflectToAttribute: true,
        observer: "_largeChanged",
      },

      _registryInfo: Object,

      dataDomain: {
        computed: "_computeDomain(stateObj)",
        reflectToAttribute: true,
      },
    };
  }

  static get observers() {
    return ["_dialogOpenChanged(opened)"];
  }

  _dialogElement() {
    return this;
  }

  _computeDomain(stateObj) {
    return stateObj ? computeStateDomain(stateObj) : "";
  }

  _computeStateObj(hass) {
    return hass.states[hass.moreInfoEntityId] || null;
  }

  async _stateObjChanged(newVal, oldVal) {
    if (!newVal) {
      this.setProperties({
        opened: false,
        _registryInfo: null,
        large: false,
      });
      return;
    }

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        // allow dialog to render content before showing it so it will be
        // positioned correctly.
        this.opened = true;
      })
    );

    if (
      !isComponentLoaded(this.hass, "config") ||
      (oldVal && oldVal.entity_id === newVal.entity_id)
    ) {
      return;
    }

    if (this.hass.user.is_admin) {
      try {
        const info = await this.hass.callWS({
          type: "config/entity_registry/get",
          entity_id: newVal.entity_id,
        });
        this._registryInfo = info;
      } catch (err) {
        this._registryInfo = null;
      }
    }
  }

  _dialogOpenChanged(newVal) {
    if (!newVal && this.stateObj) {
      this.fire("hass-more-info", { entityId: null });
    }
  }

  _equals(a, b) {
    return a === b;
  }

  _largeChanged() {
    this.notifyResize();
  }
}
customElements.define("ha-more-info-dialog", HaMoreInfoDialog);
