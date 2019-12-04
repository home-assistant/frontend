import "@material/mwc-button";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "@polymer/paper-spinner/paper-spinner";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../components/dialog/ha-paper-dialog";
import "../../components/ha-form/ha-form";
import "../../components/ha-markdown";
import "../../resources/ha-style";

import { EventsMixin } from "../../mixins/events-mixin";
import LocalizeMixin from "../../mixins/localize-mixin";

let instance = 0;

/*
 * @appliesMixin LocalizeMixin
 * @appliesMixin EventsMixin
 */
class HaMfaModuleSetupFlow extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
      <style include="ha-style-dialog">
        .error {
          color: red;
        }
        ha-paper-dialog {
          max-width: 500px;
        }
        ha-markdown img:first-child:last-child,
        ha-markdown svg:first-child:last-child {
          background-color: white;
          display: block;
          margin: 0 auto;
        }
        ha-markdown a {
          color: var(--primary-color);
        }
        .init-spinner {
          padding: 10px 100px 34px;
          text-align: center;
        }
        .submit-spinner {
          margin-right: 16px;
        }
      </style>
      <ha-paper-dialog
        id="dialog"
        with-backdrop=""
        opened="{{_opened}}"
        on-opened-changed="_openedChanged"
      >
        <h2>
          <template is="dom-if" if="[[_equals(_step.type, 'abort')]]">
            [[localize('ui.panel.profile.mfa_setup.title_aborted')]]
          </template>
          <template is="dom-if" if="[[_equals(_step.type, 'create_entry')]]">
            [[localize('ui.panel.profile.mfa_setup.title_success')]]
          </template>
          <template is="dom-if" if="[[_equals(_step.type, 'form')]]">
            [[_computeStepTitle(localize, _step)]]
          </template>
        </h2>
        <paper-dialog-scrollable>
          <template is="dom-if" if="[[_errorMsg]]">
            <div class="error">[[_errorMsg]]</div>
          </template>
          <template is="dom-if" if="[[!_step]]">
            <div class="init-spinner">
              <paper-spinner active></paper-spinner>
            </div>
          </template>
          <template is="dom-if" if="[[_step]]">
            <template is="dom-if" if="[[_equals(_step.type, 'abort')]]">
              <ha-markdown
                allowsvg
                content="[[_computeStepAbortedReason(localize, _step)]]"
              ></ha-markdown>
            </template>

            <template is="dom-if" if="[[_equals(_step.type, 'create_entry')]]">
              <p>
                [[localize('ui.panel.profile.mfa_setup.step_done', 'step',
                _step.title)]]
              </p>
            </template>

            <template is="dom-if" if="[[_equals(_step.type, 'form')]]">
              <template
                is="dom-if"
                if="[[_computeStepDescription(localize, _step)]]"
              >
                <ha-markdown
                  allowsvg
                  content="[[_computeStepDescription(localize, _step)]]"
                ></ha-markdown>
              </template>

              <ha-form
                data="{{_stepData}}"
                schema="[[_step.data_schema]]"
                error="[[_step.errors]]"
                compute-label="[[_computeLabelCallback(localize, _step)]]"
                compute-error="[[_computeErrorCallback(localize, _step)]]"
              ></ha-form>
            </template>
          </template>
        </paper-dialog-scrollable>
        <div class="buttons">
          <template is="dom-if" if="[[_equals(_step.type, 'abort')]]">
            <mwc-button on-click="_flowDone"
              >[[localize('ui.panel.profile.mfa_setup.close')]]</mwc-button
            >
          </template>
          <template is="dom-if" if="[[_equals(_step.type, 'create_entry')]]">
            <mwc-button on-click="_flowDone"
              >[[localize('ui.panel.profile.mfa_setup.close')]]</mwc-button
            >
          </template>
          <template is="dom-if" if="[[_equals(_step.type, 'form')]]">
            <template is="dom-if" if="[[_loading]]">
              <div class="submit-spinner">
                <paper-spinner active></paper-spinner>
              </div>
            </template>
            <template is="dom-if" if="[[!_loading]]">
              <mwc-button on-click="_submitStep"
                >[[localize('ui.panel.profile.mfa_setup.submit')]]</mwc-button
              >
            </template>
          </template>
        </div>
      </ha-paper-dialog>
    `;
  }

  static get properties() {
    return {
      _hass: Object,
      _dialogClosedCallback: Function,
      _instance: Number,

      _loading: {
        type: Boolean,
        value: false,
      },

      // Error message when can't talk to server etc
      _errorMsg: String,

      _opened: {
        type: Boolean,
        value: false,
      },

      _step: {
        type: Object,
        value: null,
      },

      /*
       * Store user entered data.
       */
      _stepData: Object,
    };
  }

  ready() {
    super.ready();
    this.addEventListener("keypress", (ev) => {
      if (ev.keyCode === 13) {
        this._submitStep();
      }
    });
  }

  showDialog({ hass, continueFlowId, mfaModuleId, dialogClosedCallback }) {
    this.hass = hass;
    this._instance = instance++;
    this._dialogClosedCallback = dialogClosedCallback;
    this._createdFromHandler = !!mfaModuleId;
    this._loading = true;
    this._opened = true;

    const fetchStep = continueFlowId
      ? this.hass.callWS({
          type: "auth/setup_mfa",
          flow_id: continueFlowId,
        })
      : this.hass.callWS({
          type: "auth/setup_mfa",
          mfa_module_id: mfaModuleId,
        });

    const curInstance = this._instance;

    fetchStep.then((step) => {
      if (curInstance !== this._instance) return;

      this._processStep(step);
      this._loading = false;
      // When the flow changes, center the dialog.
      // Don't do it on each step or else the dialog keeps bouncing.
      setTimeout(() => this.$.dialog.center(), 0);
    });
  }

  _submitStep() {
    this._loading = true;
    this._errorMsg = null;

    const curInstance = this._instance;

    this.hass
      .callWS({
        type: "auth/setup_mfa",
        flow_id: this._step.flow_id,
        user_input: this._stepData,
      })
      .then(
        (step) => {
          if (curInstance !== this._instance) return;

          this._processStep(step);
          this._loading = false;
        },
        (err) => {
          this._errorMsg =
            (err && err.body && err.body.message) || "Unknown error occurred";
          this._loading = false;
        }
      );
  }

  _processStep(step) {
    if (!step.errors) step.errors = {};
    this._step = step;
    // We got a new form if there are no errors.
    if (Object.keys(step.errors).length === 0) {
      this._stepData = {};
    }
  }

  _flowDone() {
    this._opened = false;
    const flowFinished =
      this._step && ["create_entry", "abort"].includes(this._step.type);

    if (this._step && !flowFinished && this._createdFromHandler) {
      // console.log('flow not finish');
    }

    this._dialogClosedCallback({
      flowFinished,
    });

    this._errorMsg = null;
    this._step = null;
    this._stepData = {};
    this._dialogClosedCallback = null;
  }

  _equals(a, b) {
    return a === b;
  }

  _openedChanged(ev) {
    // Closed dialog by clicking on the overlay
    if (this._step && !ev.detail.value) {
      this._flowDone();
    }
  }

  _computeStepAbortedReason(localize, step) {
    return localize(
      `component.auth.mfa_setup.${step.handler}.abort.${step.reason}`
    );
  }

  _computeStepTitle(localize, step) {
    return (
      localize(
        `component.auth.mfa_setup.${step.handler}.step.${step.step_id}.title`
      ) || "Setup Multi-factor Authentication"
    );
  }

  _computeStepDescription(localize, step) {
    const args = [
      `component.auth.mfa_setup.${step.handler}.step.${step.step_id}.description`,
    ];
    const placeholders = step.description_placeholders || {};
    Object.keys(placeholders).forEach((key) => {
      args.push(key);
      args.push(placeholders[key]);
    });
    return localize(...args);
  }

  _computeLabelCallback(localize, step) {
    // Returns a callback for ha-form to calculate labels per schema object
    return (schema) =>
      localize(
        `component.auth.mfa_setup.${step.handler}.step.${step.step_id}.data.${schema.name}`
      ) || schema.name;
  }

  _computeErrorCallback(localize, step) {
    // Returns a callback for ha-form to calculate error messages
    return (error) =>
      localize(`component.auth.mfa_setup.${step.handler}.error.${error}`) ||
      error;
  }
}

customElements.define("ha-mfa-module-setup-flow", HaMfaModuleSetupFlow);
