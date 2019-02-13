import "@material/mwc-button";
import "@polymer/paper-dialog-scrollable/paper-dialog-scrollable";
import "@polymer/paper-dialog/paper-dialog";
import "@polymer/paper-tooltip/paper-tooltip";
import "@polymer/paper-spinner/paper-spinner";
import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "../../../components/ha-form";
import "../../../components/ha-markdown";
import "../../../resources/ha-style";

import EventsMixin from "../../../mixins/events-mixin";
import LocalizeMixin from "../../../mixins/localize-mixin";

let instance = 0;

/*
 * @appliesMixin LocalizeMixin
 * @appliesMixin EventsMixin
 */
class HaConfigFlow extends LocalizeMixin(EventsMixin(PolymerElement)) {
  static get template() {
    return html`
      <style include="ha-style-dialog">
        .error {
          color: red;
        }
        paper-dialog {
          max-width: 500px;
        }
        ha-markdown {
          word-break: break-word;
        }
        ha-markdown a {
          color: var(--primary-color);
        }
        ha-markdown img:first-child:last-child {
          display: block;
          margin: 0 auto;
        }
        .init-spinner {
          padding: 10px 100px 34px;
          text-align: center;
        }
        .submit-spinner {
          margin-right: 16px;
        }
      </style>
      <paper-dialog
        id="dialog"
        with-backdrop=""
        opened="{{_opened}}"
        on-opened-changed="_openedChanged"
      >
        <h2>
          <template is="dom-if" if="[[_equals(_step.type, 'abort')]]">
            Aborted
          </template>
          <template is="dom-if" if="[[_equals(_step.type, 'create_entry')]]">
            Success!
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
            <template is="dom-if" if="[[_equals(_step.type, 'create_entry')]]">
              <p>Created config for [[_step.title]]</p>
            </template>

            <template
              is="dom-if"
              if="[[_computeStepDescription(localize, _step)]]"
            >
              <ha-markdown
                content="[[_computeStepDescription(localize, _step)]]"
                allow-svg
              ></ha-markdown>
            </template>

            <template is="dom-if" if="[[_equals(_step.type, 'form')]]">
              <ha-form
                data="{{_stepData}}"
                on-data-changed="_increaseCounter"
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
            <mwc-button on-click="_flowDone">Close</mwc-button>
          </template>
          <template is="dom-if" if="[[_equals(_step.type, 'create_entry')]]">
            <mwc-button on-click="_flowDone">Close</mwc-button>
          </template>
          <template is="dom-if" if="[[_equals(_step.type, 'form')]]">
            <template is="dom-if" if="[[_loading]]">
              <div class="submit-spinner">
                <paper-spinner active></paper-spinner>
              </div>
            </template>
            <template is="dom-if" if="[[!_loading]]">
              <div>
                <mwc-button on-click="_submitStep" disabled="[[!_canSubmit]]"
                  >Submit</mwc-button
                >
                <template is="dom-if" if="[[!_canSubmit]]">
                  <paper-tooltip position="left">
                    Not all required fields are filled in.
                  </paper-tooltip>
                </template>
              </div>
            </template>
          </template>
        </div>
      </paper-dialog>
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

      _canSubmit: {
        type: Boolean,
        computed: "_computeCanSubmit(_step, _stepData, _counter)",
      },

      // Bogus counter because observing of `_stepData` doesn't seem to work
      _counter: {
        type: Number,
        value: 0,
      },

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
      _stepData: {
        type: Object,
        value: null,
      },
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

  showDialog({
    hass,
    continueFlowId,
    newFlowForHandler,
    dialogClosedCallback,
  }) {
    this.hass = hass;
    this._instance = instance++;
    this._dialogClosedCallback = dialogClosedCallback;
    this._createdFromHandler = !!newFlowForHandler;
    this._loading = true;
    this._opened = true;

    const fetchStep = continueFlowId
      ? this.hass.callApi("get", `config/config_entries/flow/${continueFlowId}`)
      : this.hass.callApi("post", "config/config_entries/flow", {
          handler: newFlowForHandler,
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

    const data = {};
    Object.keys(this._stepData).forEach((key) => {
      const value = this._stepData[key];
      const isEmpty = [undefined, ""].includes(value);

      if (!isEmpty) {
        data[key] = value;
      }
    });

    this.hass
      .callApi("post", `config/config_entries/flow/${this._step.flow_id}`, data)
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
    if (step.type === "form" && Object.keys(step.errors).length === 0) {
      const data = {};
      step.data_schema.forEach((field) => {
        if ("default" in field) {
          data[field.name] = field.default;
        }
      });
      this._stepData = data;
    }
  }

  _flowDone() {
    this._opened = false;
    const flowFinished =
      this._step && ["success", "abort"].includes(this._step.type);

    if (this._step && !flowFinished && this._createdFromHandler) {
      this.hass.callApi(
        "delete",
        `config/config_entries/flow/${this._step.flow_id}`
      );
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

  _computeStepTitle(localize, step) {
    return localize(
      `component.${step.handler}.config.step.${step.step_id}.title`
    );
  }

  _computeStepDescription(localize, step) {
    const args = [];
    if (step.type === "form") {
      args.push(
        `component.${step.handler}.config.step.${step.step_id}.description`
      );
    } else if (step.type === "abort") {
      args.push(`component.${step.handler}.config.abort.${step.reason}`);
    } else if (step.type === "create_entry") {
      args.push(
        `component.${step.handler}.config.create_entry.${step.description ||
          "default"}`
      );
    }

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
        `component.${step.handler}.config.step.${step.step_id}.data.${
          schema.name
        }`
      );
  }

  _computeErrorCallback(localize, step) {
    // Returns a callback for ha-form to calculate error messages
    return (error) =>
      localize(`component.${step.handler}.config.error.${error}`);
  }

  _computeCanSubmit(step, stepData) {
    // We can submit if all required fields are filled in
    return (
      step !== null &&
      step.type === "form" &&
      stepData !== null &&
      step.data_schema.every(
        (field) =>
          field.optional || !["", undefined].includes(stepData[field.name])
      )
    );
  }

  _increaseCounter() {
    this._counter += 1;
  }
}

customElements.define("ha-config-flow", HaConfigFlow);
